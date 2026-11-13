"use client";

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConceptChatCard } from './concept-chat-card';
import { getRecommendedChats } from '@/lib/data/sat-concept-chats';
import { useLearningProfileApi } from '@/hooks/api/learning-profile/use-learning-profile.api';
import { ChevronDown, ChevronUp, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import { CurioMarkdown } from '../core/curio-markdown';

interface SATMiniQuestion {
  questionId: string;
  questionContent: string;
  options: string[];
  correctAnswer: number;
  hint?: string;
  answerExplanations?: string[];
  concept: string;
  subtopic: string;
  difficulty?: string;
  givenAnswer?: number | null;
}

interface SATMiniModule {
  moduleNumber: number;
  moduleType: 'reading_writing' | 'math';
  difficulty: 'easy_medium' | 'medium_hard';
  questions: SATMiniQuestion[];
  correctCount: number;
  totalQuestions: number;
  score?: number;
}

interface ExamResultsProps {
  predictedSATScore: number;
  readingWritingScore: number;
  mathScore: number;
  totalCorrect: number;
  totalQuestions: number;
  modules: SATMiniModule[];
  previousScore?: number;
  masteryUpdates?: Record<string, { oldValue: number; newValue: number }>;
  onStartNewChat?: (prompt: string) => void;
  userUuid?: string; // Add userUuid for fetching learning profile
  isUserSubscribed?: boolean;
}

export function ExamResults({
  predictedSATScore,
  readingWritingScore,
  mathScore,
  totalCorrect,
  totalQuestions,
  modules,
  previousScore,
  masteryUpdates = {},
  onStartNewChat,
  userUuid,
  isUserSubscribed = false,
}: ExamResultsProps) {
  const router = useRouter();
  const [isQuestionsExpanded, setIsQuestionsExpanded] = useState(false);
  
  // Fetch user's learning profile for recommendations when masteryUpdates is not available
  const { learningProfile } = useLearningProfileApi(userUuid);

  // Calculate delta from previous exam
  const delta = previousScore ? predictedSATScore - previousScore : null;

  // Analyze mistakes by concept
  const mistakeAnalysis = useMemo(() => {
    const conceptMistakes: Record<string, { count: number; total: number; subtopic: string }> = {};
    
    modules.forEach(module => {
      module.questions.forEach(q => {
        if (!q.concept) return;
        
        if (!conceptMistakes[q.concept]) {
          conceptMistakes[q.concept] = { count: 0, total: 0, subtopic: q.subtopic || '' };
        }
        
        conceptMistakes[q.concept].total++;
        
        const isWrong = q.givenAnswer === null || q.givenAnswer !== q.correctAnswer;
        if (isWrong) {
          conceptMistakes[q.concept].count++;
        }
      });
    });
    
    // Sort by mistake count
    return Object.entries(conceptMistakes)
      .filter(([_, data]) => data.count > 0)
      .sort((a, b) => b[1].count - a[1].count);
  }, [modules]);

  // Get topic breakdown (Math vs Reading & Writing)
  const topicBreakdown = useMemo(() => {
    let mathCorrect = 0;
    let mathTotal = 0;
    let rwCorrect = 0;
    let rwTotal = 0;
    
    modules.forEach(module => {
      const isMath = module.moduleType === 'math';
      module.questions.forEach(q => {
        const isCorrect = q.givenAnswer !== null && q.givenAnswer === q.correctAnswer;
        
        if (isMath) {
          mathTotal++;
          if (isCorrect) mathCorrect++;
        } else {
          rwTotal++;
          if (isCorrect) rwCorrect++;
        }
      });
    });
    
    return {
      math: { correct: mathCorrect, total: mathTotal },
      rw: { correct: rwCorrect, total: rwTotal },
    };
  }, [modules]);

  // Get recommended chats based on mistakes
  const recommendedChats = useMemo(() => {
    // Build mastery profile from either masteryUpdates or learningProfile
    const masteryProfile: Record<string, { mastery: number }> = {};
    
    // Priority 1: Use masteryUpdates if available (for newly completed exams)
    if (masteryUpdates && Object.keys(masteryUpdates).length > 0) {
      Object.entries(masteryUpdates).forEach(([concept, { newValue }]) => {
        masteryProfile[concept] = { mastery: newValue };
      });
    } 
    // Priority 2: Use learningProfile from database (for viewing old exams)
    else if (learningProfile && learningProfile.length > 0) {
      learningProfile.forEach(profile => {
        masteryProfile[profile.concept] = { mastery: profile.masteryLevel };
      });
    }
    
    // Get all available chats
    const allChats = getRecommendedChats(masteryProfile);
    
    // If no mistakes, return top 4 chats based on mastery
    if (mistakeAnalysis.length === 0) {
      return allChats.slice(0, 4);
    }
    
    // Get top 4 concepts with mistakes from mistakeAnalysis
    const topMistakeConcepts = mistakeAnalysis
      .map(([concept]) => concept);
    
    // Filter to only show chats for concepts with mistakes
    const filteredChats = allChats.filter(chat => 
      topMistakeConcepts.includes(chat.conceptId)
    );
    
    // If we have filtered chats, return them, otherwise return any chats
    return filteredChats.length > 0 ? filteredChats.slice(0, 4) : allChats.slice(0, 4);
  }, [mistakeAnalysis, masteryUpdates, learningProfile]);

  const totalMistakes = totalQuestions - totalCorrect;

  // Flatten all questions from all modules with module info
  const allQuestions = useMemo(() => {
    const questions: (SATMiniQuestion & { moduleNumber: number; moduleType: string; questionNumber: number })[] = [];
    let globalQuestionNumber = 1;
    
    modules.forEach(module => {
      module.questions.forEach(q => {
        questions.push({
          ...q,
          moduleNumber: module.moduleNumber,
          moduleType: module.moduleType,
          questionNumber: globalQuestionNumber++,
        });
      });
    });
    
    return questions;
  }, [modules]);

  // Helper to get option label (A, B, C, D)
  const getOptionLabel = (index: number) => String.fromCharCode(65 + index);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push('/satus')}
          className="cursor-pointer flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-6 group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to SAT Dashboard</span>
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Exam Complete! 🎉
          </h1>
          <p className="text-gray-600">
            Great job! Here's how you performed.
          </p>
        </div>

        {/* Main Score Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 border-2 border-gray-200">
          <div className="text-center mb-6">
            <div className="inline-flex items-baseline gap-2">
              <span className="text-6xl font-bold text-gray-900">
                {predictedSATScore}
              </span>
              {/* {delta !== null && (
                <span className={`text-2xl font-semibold ${delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {delta >= 0 ? '+' : ''}{delta}
                </span>
              )} */}
            </div>
            <p className="text-gray-600 mt-2">Predicted SAT Score</p>
          </div>

          {/* Section Scores */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-gray-900">{readingWritingScore}</div>
              <div className="text-sm text-gray-600 mt-1">Reading & Writing</div>
            </div>
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-gray-900">{mathScore}</div>
              <div className="text-sm text-gray-600 mt-1">Math</div>
            </div>
          </div>

          {/* Accuracy */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-700 font-medium">Accuracy</span>
              <span className="text-gray-900 font-bold">
                {totalCorrect}/{totalQuestions} ({Math.round((totalCorrect / totalQuestions) * 100)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-gray-600 to-gray-800 h-3 rounded-full transition-all duration-500"
                style={{ width: `${(totalCorrect / totalQuestions) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Performance Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Topic Breakdown */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Topic Breakdown 📊</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-700">Math</span>
                  <span className="text-gray-900 font-semibold">
                    {topicBreakdown.math.correct}/{topicBreakdown.math.total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gray-700 h-2 rounded-full"
                    style={{ width: `${(topicBreakdown.math.correct / topicBreakdown.math.total) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-700">Reading & Writing</span>
                  <span className="text-gray-900 font-semibold">
                    {topicBreakdown.rw.correct}/{topicBreakdown.rw.total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gray-700 h-2 rounded-full"
                    style={{ width: `${(topicBreakdown.rw.correct / topicBreakdown.rw.total) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Mistakes Summary */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Mistakes Analysis ❌</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Total Mistakes</span>
                <span className="text-2xl font-bold text-red-600">{totalMistakes}</span>
              </div>
              {mistakeAnalysis.length > 0 && (
                <>
                  <div className="border-t border-gray-200 pt-3">
                    <p className="text-sm text-gray-600 mb-2">Most mistakes in:</p>
                    {mistakeAnalysis.slice(0, 3).map(([concept, data]) => (
                      <div key={concept} className="flex items-center justify-between py-1">
                        <span className="text-sm text-gray-700 truncate flex-1" title={concept}>
                          {concept.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </span>
                        <span className="text-sm font-semibold text-red-600 ml-2">
                          {data.count}/{data.total}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mastery Updates */}
        {masteryUpdates && Object.keys(masteryUpdates).length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Mastery Updates 📈</h3>
            <p className="text-sm text-gray-600 mb-4">Your mastery levels have been updated based on this exam:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(masteryUpdates).map(([concept, { oldValue, newValue }]) => {
                const delta = newValue - oldValue;
                return (
                  <div key={concept} className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-2 truncate" title={concept}>
                      {concept.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-gray-900">{oldValue}%</span>
                      <span className="text-gray-400">→</span>
                      <span className="text-xl font-bold text-gray-900">{newValue}%</span>
                      <span className={`text-sm font-semibold ml-auto ${delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {delta >= 0 ? '+' : ''}{delta}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* All Questions Review - Collapsible */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 mb-6 overflow-hidden">
          <button
            onClick={() => setIsQuestionsExpanded(!isQuestionsExpanded)}
            className="w-full cursor-pointer p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-gray-900">All Questions Review 📝</h3>
              <span className="text-sm text-gray-600">
                ({totalCorrect} correct, {totalMistakes} incorrect)
              </span>
            </div>
            {isQuestionsExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </button>

          {isQuestionsExpanded && (
            <div className="px-6 pb-6 border-t border-gray-200">
              <div className="space-y-4 mt-4">
                {allQuestions.map((question) => {
                  const isCorrect = question.givenAnswer !== null && question.givenAnswer === question.correctAnswer;
                  const wasAnswered = question.givenAnswer !== null;
                  
                  return (
                    <div 
                      key={question.questionId}
                      className={`p-4 rounded-lg border-2 ${
                        isCorrect 
                          ? 'bg-green-50 border-green-200' 
                          : wasAnswered 
                            ? 'bg-red-50 border-red-200'
                            : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      {/* Question Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-700">
                            Q{question.questionNumber}
                          </span>
                          <span className="text-xs text-gray-500">
                            Module {question.moduleNumber} • {question.moduleType === 'math' ? 'Math' : 'Reading & Writing'}
                          </span>
                          {question.concept && (
                            <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                              {question.concept.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                            </span>
                          )}
                        </div>
                        {isCorrect ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                        ) : wasAnswered ? (
                          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        ) : (
                          <span className="text-xs text-gray-500">Skipped</span>
                        )}
                      </div>

                      {/* Question Content */}
                      <div className="text-sm text-gray-900 mb-3 whitespace-pre-wrap">
                        {question.questionContent}
                      </div>

                      {/* Options for Multiple Choice */}
                      {question.options && question.options.length > 0 && (
                        <div className="space-y-2 mb-3">
                          {question.options.map((option, index) => {
                            const isUserAnswer = question.givenAnswer === index;
                            const isCorrectAnswer = question.correctAnswer === index;
                            
                            return (
                              <div
                                key={index}
                                className={`flex items-start gap-2 p-2 rounded text-sm ${
                                  isCorrectAnswer && !isCorrect
                                    ? 'bg-green-100 border border-green-300'
                                    : isUserAnswer && !isCorrect
                                      ? 'bg-red-100 border border-red-300'
                                      : isUserAnswer && isCorrect
                                        ? 'bg-green-100 border border-green-300'
                                        : 'bg-white'
                                }`}
                              >
                                <span className="font-semibold text-gray-700 flex-shrink-0">
                                  {getOptionLabel(index)}.
                                </span>
                                <span className="text-gray-900 flex-1">{option}</span>
                                {isUserAnswer && (
                                  <span className="text-xs text-gray-600 flex-shrink-0">Your answer</span>
                                )}
                                {isCorrectAnswer && !isCorrect && (
                                  <span className="text-xs text-green-700 font-semibold flex-shrink-0">Correct</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Answer Summary */}
                      <div className="text-sm">
                        {!wasAnswered ? (
                          <div className="text-gray-600 italic">You skipped this question</div>
                        ) : isCorrect ? (
                          <div className="text-green-700 font-medium">✓ Correct!</div>
                        ) : (
                          <div className="space-y-1">
                            <div className="text-red-700">
                              <span className="font-medium">Your answer:</span>{' '}
                              {question.options?.length > 0 
                                ? getOptionLabel(question.givenAnswer!)
                                : question.givenAnswer}
                            </div>
                            <div className="text-green-700">
                              <span className="font-medium">Correct answer:</span>{' '}
                              {question.options?.length > 0 
                                ? getOptionLabel(question.correctAnswer)
                                : question.correctAnswer}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Explanation if available and wrong */}
                      {question.answerExplanations && question.answerExplanations[question.correctAnswer] && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                          <div className="font-medium text-blue-900 mb-1">💡 Explanation:</div>
                          <div className="text-blue-800">
                            <CurioMarkdown content={question.answerExplanations[question.correctAnswer]} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Recommended Practice */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Recommended Practice 💡</h3>
          <p className="text-gray-600 mb-4">
            {mistakeAnalysis.length > 0 
              ? "Based on your mistakes, we recommend practicing these topics:"
              : "Keep practicing to improve your skills:"}
          </p>
          {recommendedChats.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendedChats.map((chat, index) => {
                const isLocked = !isUserSubscribed && index > 0;
                
                return (
                  <ConceptChatCard
                    key={`${chat.conceptId}-${chat.masteryLevel}`}
                    chat={chat}
                    masteryLevel={masteryUpdates?.[chat.conceptId]?.newValue}
                    onClick={onStartNewChat || (() => {})}
                    isLocked={isLocked}
                    onUpgradeClick={() => router.push('/exam-bundles')}
                  />
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              No specific recommendations at this time. Keep up the great work!
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center">
          <button
            onClick={() => router.push('/satus')}
            className="cursor-pointer bg-gradient-to-r from-gray-700 to-gray-900 text-white font-semibold py-4 px-8 rounded-xl hover:from-gray-800 hover:to-gray-950 transition-all shadow-md"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

