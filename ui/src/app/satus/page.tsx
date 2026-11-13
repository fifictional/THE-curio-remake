"use client";

import { useEffect, useMemo, useCallback, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthenticator } from '@/lib/local-auth-react';
import { useLearningProfileApi } from '@/hooks/api/learning-profile/use-learning-profile.api';
import { useWeeklyProgress } from '@/hooks/api/sat-mini/use-weekly-progress.api';
import { useMasteryLevels } from '@/hooks/api/satus/use-mastery-levels';
import { useSATMiniExamLogs } from '@/hooks/api/sat-mini/use-sat-mini-exam-logs.api';
import { useRecentMistakes } from '@/hooks/api/sat-mini/use-recent-mistakes.api';
import { ConceptChat, getRecommendedChatsWithMistakes } from '@/lib/data/sat-concept-chats';
import { useCreateGeneralChatApi } from '@/hooks/api/chats/use-create-general-chat.api';
import { useSessionContext } from '@/providers/session-provider';
import { WeeklyPredictionCard } from '@/components/satus/weekly-prediction-card';
import { RecentExamsSection } from '@/components/satus/recent-exams-section';
import { MasteryCards } from '@/components/satus/mastery-cards';
import { PracticeTopicsSection } from '@/components/satus/practice-topics-section';
import { useCreateSATMiniExam } from '@/hooks/api/sat-mini/use-create-sat-mini-exam.api';
import { useSaveLearningProfile } from '@/hooks/api/learning-profile/use-save-learning-profile.api';
import { useSaveSATMiniExam } from '@/hooks/api/sat-mini/use-save-sat-mini-exam.api';
import { useAnalytics } from '@/providers/analytics-provider';

export default function SatusPage() {
  const { route, user } = useAuthenticator(context => [context.route, context.user]);
  const router = useRouter();
  const { track } = useAnalytics();
  const { isUserSubscribed } = useSessionContext();
  const { learningProfile, isLoading, hasProfile, refetch: refetchProfile } = useLearningProfileApi(user?.userId);
  const { weeklyProgress, isLoading: loadingProgress } = useWeeklyProgress(user?.userId || null, hasProfile);
  const { mathMastery, englishMastery } = useMasteryLevels(learningProfile);
  const { examLogs, isLoading: loadingExamLogs } = useSATMiniExamLogs(user?.userId || null);
  const { mistakes, isLoading: loadingMistakes } = useRecentMistakes(user?.userId || null, 3);
  const { onChatStarted } = useCreateGeneralChatApi({ spaceUuid: null });
  const { createExam, isCreating } = useCreateSATMiniExam();
  const { loadFromLocalStorage: loadProfileFromLS, clearLocalStorage: clearProfileLS, saveLearningProfile } = useSaveLearningProfile();
  const { loadFromLocalStorage: loadExamFromLS, clearLocalStorage: clearExamLS, migrateToDatabase } = useSaveSATMiniExam();
  
  const [isMigratingData, setIsMigratingData] = useState(false);
  const [hasMigrationAttempted, setHasMigrationAttempted] = useState(false);
  const hasTrackedDashboardLoad = useRef(false);

  // Get the last 3 exams (including in-progress)
  const recentExams = examLogs.slice(0, 3).reverse();
  
  // Get only completed exams for statistics
  const completedExams = examLogs.filter(log => log.status === 'COMPLETED');

  // Calculate how many exams were taken today
  const examsToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return examLogs.filter(log => {
      if (log.status !== 'COMPLETED') return false;
      const examDate = new Date(log.startedAt);
      examDate.setHours(0, 0, 0, 0);
      return examDate.getTime() === today.getTime();
    }).length;
  }, [examLogs]);

  // Check if user has reached daily limit (2 exams for free users)
  const hasReachedDailyExamLimit = !isUserSubscribed && examsToday >= 2;

  // Get recommended concept chats organized by mastery level
  const { chatsByMasteryLevel, masteryMap } = useMemo(() => {
    if (!learningProfile || learningProfile.length === 0) {
      return {
        chatsByMasteryLevel: {
          recentMistakes: [], // Concepts with recent errors
          weaknesses: [],     // mastery < 50
          basics: [],         // mastery 50-75
          advanced: [],       // mastery 76-90
          mastery: [],        // mastery > 90
        },
        masteryMap: {},
      };
    }
    
    // Convert learning profile array to the format expected by getRecommendedChatsWithMistakes
    const masteryMap: Record<string, { mastery: number }> = {};
    learningProfile.forEach((item) => {
      masteryMap[item.concept] = { mastery: item.masteryLevel };
    });

    // Get concept IDs where user made recent mistakes
    const mistakeConceptIds = mistakes.map(m => m.conceptId);

    // Get all recommended chats
    const allChats = getRecommendedChatsWithMistakes(masteryMap, mistakeConceptIds, 20);
    
    // Get chats for recent mistakes (prioritize these)
    const recentMistakes = allChats.filter(chat => 
      mistakeConceptIds.includes(chat.conceptId)
    ).slice(0, 4);
    
    // Organize remaining chats by mastery level (excluding recent mistakes)
    const remainingChats = allChats.filter(chat => 
      !mistakeConceptIds.includes(chat.conceptId)
    );

    const weaknesses = remainingChats.filter(chat => {
      const mastery = masteryMap[chat.conceptId]?.mastery || 50;
      return mastery < 50;
    }).slice(0, 4);

    const basics = remainingChats.filter(chat => {
      const mastery = masteryMap[chat.conceptId]?.mastery || 50;
      return mastery >= 50 && mastery < 76;
    }).slice(0, 4);

    const advanced = remainingChats.filter(chat => {
      const mastery = masteryMap[chat.conceptId]?.mastery || 50;
      return mastery >= 76 && mastery < 91;
    }).slice(0, 4);

    const masteryLevel = remainingChats.filter(chat => {
      const mastery = masteryMap[chat.conceptId]?.mastery || 50;
      return mastery > 90;
    }).slice(0, 4);

    return {
      chatsByMasteryLevel: {
        recentMistakes,
        weaknesses,
        basics,
        advanced,
        mastery: masteryLevel,
      },
      masteryMap,
    };
  }, [learningProfile, mistakes]);

  // Handle chat card click
  const handleChatClick = useCallback(async (prompt: string, chat?: ConceptChat) => {
    // Get the actual mastery level (number) from the masteryMap
    const actualMasteryLevel = chat?.conceptId ? masteryMap[chat.conceptId]?.mastery : undefined;
    
    track('sat_dashboard_practice_chat_clicked', {
      concept_id: chat?.conceptId || 'unknown',
      concept_name: chat?.conceptDisplay || 'unknown',
      mastery_level: actualMasteryLevel !== undefined ? Math.round(actualMasteryLevel) : 0,
      mastery_category: chat?.masteryLevel || 'unknown', // beginner/improving/perfection
      topic: chat?.topic || 'unknown',
      prompt_preview: prompt.substring(0, 50),
      is_subscribed: isUserSubscribed,
    });
    await onChatStarted(prompt);
  }, [onChatStarted, track, isUserSubscribed, masteryMap]);

  // Handle upgrade button click
  const handleUpgradeClick = useCallback((source: string) => {
    track('sat_dashboard_upgrade_clicked', {
      source,
      is_subscribed: isUserSubscribed,
      has_reached_daily_limit: hasReachedDailyExamLimit,
    });
    router.push('/exam-bundles');
  }, [router, track, isUserSubscribed, hasReachedDailyExamLimit]);

  // Handle view progress click - redirect to subscriptions if locked, otherwise to progress page
  const handleViewProgress = useCallback(() => {
    const isLocked = !isUserSubscribed;
    track('sat_dashboard_view_progress_clicked', {
      is_locked: isLocked,
      is_subscribed: isUserSubscribed,
      exams_completed: weeklyProgress?.examsCompleted || 0,
      average_score: weeklyProgress?.averageSATScore || 0,
    });
    
    if (!isUserSubscribed) {
      router.push('/exam-bundles');
    } else {
      router.push('/satus/progress');
    }
  }, [isUserSubscribed, router, track, weeklyProgress]);

  // Handle take exam button click
  const handleTakeExam = useCallback(async () => {
    if (!user?.userId || isCreating) return;
    
    track('sat_dashboard_take_exam_clicked', {
      is_subscribed: isUserSubscribed,
      total_exams_taken: examLogs.length,
      exams_today: examsToday,
      has_in_progress_exam: recentExams.some(e => e.status === 'IN_PROGRESS'),
      math_mastery: mathMastery,
      english_mastery: englishMastery,
    });
    
    const examLogUuid = await createExam({ userUuid: user.userId });
    if (examLogUuid) {
      track('sat_exam_created', {
        exam_log_uuid: examLogUuid,
        total_exams_taken: examLogs.length + 1,
      });
      router.push(`/satus/take/${examLogUuid}`);
    } else {
      track('sat_exam_creation_failed', {
        total_exams_taken: examLogs.length,
      });
    }
  }, [user?.userId, isCreating, createExam, router, track, isUserSubscribed, examLogs.length, examsToday, recentExams, mathMastery, englishMastery]);

  useEffect(() => {
    // Wait for auth to be determined
    if (route === 'idle') return;

    // If user is not authenticated, redirect to satus-onboarding
    if (!user) {
      router.replace('/satus-onboarding');
      return;
    }

    // Wait for profile to load
    if (isLoading) return;

    // If no learning profile found, check for local storage data before redirecting
    // Only attempt migration once
    if (!hasProfile && !hasMigrationAttempted) {
      const migrateLocalStorageData = async () => {
        try {
          setHasMigrationAttempted(true);
          setIsMigratingData(true);
          console.log('🔄 Checking for local storage data to migrate...');

          // Check for learning profile in local storage
          const localProfile = loadProfileFromLS();
          
          // Check for SAT mini exam logs in local storage
          const localExams = loadExamFromLS();

          if (!localProfile && localExams.length === 0) {
            // No data in local storage, redirect to onboarding
            console.log('📭 No local storage data found, redirecting to onboarding');
            track('sat_dashboard_no_data_redirect', {
              has_profile: hasProfile,
              is_authenticated: !!user,
            });
            setIsMigratingData(false);
            router.replace('/satus-onboarding');
            return;
          }

          console.log('📦 Found local storage data, migrating to database...');
          track('sat_dashboard_migration_started', {
            has_local_profile: !!localProfile,
            local_exams_count: localExams.length,
          });
          
          // Migrate learning profile
          if (localProfile && user.userId) {
            console.log('📚 Migrating learning profile...');
            const success = await saveLearningProfile(localProfile, user.userId);
            if (success) {
              clearProfileLS();
              console.log('✓ Learning profile migrated successfully');
              track('sat_dashboard_profile_migrated', {
                concepts_count: Array.isArray(localProfile) ? localProfile.length : 0,
              });
            } else {
              console.error('✗ Failed to migrate learning profile');
              track('sat_dashboard_profile_migration_failed', {
                concepts_count: Array.isArray(localProfile) ? localProfile.length : 0,
              });
            }
          }

          // Migrate SAT mini exam logs
          if (localExams.length > 0 && user.userId) {
            console.log(`📝 Migrating ${localExams.length} exam log(s)...`);
            const success = await migrateToDatabase(user.userId);
            if (success) {
              console.log('✓ Exam logs migrated successfully');
              track('sat_dashboard_exams_migrated', {
                exams_count: localExams.length,
              });
            } else {
              console.error('✗ Failed to migrate exam logs');
              track('sat_dashboard_exams_migration_failed', {
                exams_count: localExams.length,
              });
            }
          }

          // Refresh the page to reload all data
          console.log('✅ Migration complete! Reloading dashboard...');
          track('sat_dashboard_migration_completed', {
            has_local_profile: !!localProfile,
            local_exams_count: localExams.length,
          });
          window.location.reload();
        } catch (error) {
          console.error('❌ Error during migration:', error);
          track('sat_dashboard_migration_error', {
            error: error instanceof Error ? error.message : 'unknown',
          });
          setIsMigratingData(false);
          // On error, still redirect to onboarding
          router.replace('/satus-onboarding');
        }
      };

      migrateLocalStorageData();
    }
  }, [route, user, isLoading, hasProfile, hasMigrationAttempted, router, loadProfileFromLS, loadExamFromLS, saveLearningProfile, migrateToDatabase, clearProfileLS, refetchProfile, track]);

  // Track dashboard load with user data (only once)
  useEffect(() => {
    if (!isLoading && hasProfile && user && !isMigratingData && !hasTrackedDashboardLoad.current) {
      hasTrackedDashboardLoad.current = true;
      track('sat_dashboard_loaded', {
        is_subscribed: isUserSubscribed,
        total_exams: examLogs.length,
        completed_exams: completedExams.length,
        in_progress_exams: examLogs.filter(e => e.status === 'IN_PROGRESS').length,
        weekly_average_score: weeklyProgress?.averageSATScore || 0,
        weekly_accuracy: weeklyProgress?.accuracy || 0,
        weekly_exams_completed: weeklyProgress?.examsCompleted || 0,
        math_mastery: mathMastery,
        english_mastery: englishMastery,
        recent_mistakes_count: mistakes.length,
        has_reached_daily_limit: hasReachedDailyExamLimit,
        exams_taken_today: examsToday,
      });
    }
  }, [isLoading, hasProfile, user, isMigratingData, track, isUserSubscribed, examLogs.length, completedExams.length, weeklyProgress, mathMastery, englishMastery, mistakes.length, hasReachedDailyExamLimit, examsToday, examLogs]);

  // Show loading while checking auth status and learning profile
  if (route === 'idle' || !user || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Show migration loader if we're migrating data from local storage
  if (isMigratingData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-linear-to-br from-blue-50 to-purple-50">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-6"></div>
          <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-4 border-blue-400 opacity-20"></div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Hold tight! 🚀</h2>
        <p className="text-lg text-gray-700 font-medium">We're fetching your assessment results...</p>
        <p className="text-sm text-gray-500 mt-2">Setting up your personalized dashboard</p>
        <div className="mt-6 flex gap-2">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    );
  }

  // If no profile, don't render (will redirect or is migrating)
  if (!hasProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Main SAT US Dashboard for authenticated users
  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            SAT US Preparation
          </h1>
          <p className="text-lg text-gray-600">
            Track your progress and improve your score
          </p>
        </div>

        {/* Weekly Prediction Card */}
        <WeeklyPredictionCard
          isLoading={loadingProgress}
          averageSATScore={weeklyProgress?.averageSATScore || 0}
          accuracy={weeklyProgress?.accuracy || 0}
          examsCompleted={weeklyProgress?.examsCompleted || 0}
          onViewProgress={handleViewProgress}
          isLocked={!isUserSubscribed}
        />

        {/* Recent Exams */}
        <RecentExamsSection
          isLoading={loadingExamLogs || isCreating}
          recentExams={recentExams}
          hasReachedDailyLimit={hasReachedDailyExamLimit}
          onTakeExam={handleTakeExam}
          onUpgrade={() => handleUpgradeClick('recent_exams_section')}
        />

        {/* Mastery Split */}
        <MasteryCards mathMastery={mathMastery} englishMastery={englishMastery} />

        {/* Practice by Topic Sections */}
        <PracticeTopicsSection
          chatsByMasteryLevel={chatsByMasteryLevel}
          masteryMap={masteryMap}
          isUserSubscribed={isUserSubscribed}
          onChatClick={handleChatClick}
          onUpgradeClick={() => handleUpgradeClick('practice_topics_section')}
          onTakeAssessment={() => {
            track('sat_dashboard_retake_assessment_clicked', {
              total_exams: examLogs.length,
              math_mastery: mathMastery,
              english_mastery: englishMastery,
            });
            router.push('/satus-onboarding');
          }}
        />

      </div>
    </div>
  );
}
