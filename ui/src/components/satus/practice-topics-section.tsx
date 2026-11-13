import { ConceptChatCard } from './concept-chat-card';
import { type ConceptChat } from '@/lib/data/sat-concept-chats';

interface ChatsByMasteryLevel {
  recentMistakes: ConceptChat[];
  weaknesses: ConceptChat[];
  basics: ConceptChat[];
  advanced: ConceptChat[];
  mastery: ConceptChat[];
}

interface PracticeTopicsSectionProps {
  chatsByMasteryLevel: ChatsByMasteryLevel;
  masteryMap: Record<string, { mastery: number }>;
  isUserSubscribed: boolean;
  onChatClick: (prompt: string, chat?: ConceptChat) => void;
  onUpgradeClick: () => void;
  onTakeAssessment: () => void;
}

export function PracticeTopicsSection({
  chatsByMasteryLevel,
  masteryMap,
  isUserSubscribed,
  onChatClick,
  onUpgradeClick,
  onTakeAssessment,
}: PracticeTopicsSectionProps) {
  const hasAnyChats = 
    chatsByMasteryLevel.recentMistakes.length > 0 ||
    chatsByMasteryLevel.weaknesses.length > 0 ||
    chatsByMasteryLevel.basics.length > 0 ||
    chatsByMasteryLevel.advanced.length > 0 ||
    chatsByMasteryLevel.mastery.length > 0;

  if (!hasAnyChats) {
    return (
      <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-8 text-center">
        <p className="text-gray-600">
          Complete the assessment to get personalized topic recommendations
        </p>
        <button
          onClick={onTakeAssessment}
          className="mt-4 bg-gray-700 text-white hover:bg-gray-900 font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          Take Assessment
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Learn from Your Mistakes */}
      {chatsByMasteryLevel.recentMistakes.length > 0 && (
        <div>
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Learn from Your Mistakes ❌</h2>
            <p className="text-sm text-gray-600 mt-1">
              Review concepts where you made errors in recent exams
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {chatsByMasteryLevel.recentMistakes.map((chat, index) => (
              <ConceptChatCard
                key={`mistake-${chat.conceptId}-${index}`}
                chat={chat}
                onClick={onChatClick}
                masteryLevel={masteryMap[chat.conceptId]?.mastery}
                isLocked={!isUserSubscribed && index >= 1}
                onUpgradeClick={onUpgradeClick}
              />
            ))}
          </div>
        </div>
      )}

      {/* Fix Your Weaknesses */}
      {chatsByMasteryLevel.weaknesses.length > 0 && (
        <div>
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Fix Your Weaknesses 🔧</h2>
            <p className="text-sm text-gray-600 mt-1">
              Focus on concepts where you need the most improvement
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {chatsByMasteryLevel.weaknesses.map((chat, index) => (
              <ConceptChatCard
                key={`weakness-${chat.conceptId}-${index}`}
                chat={chat}
                onClick={onChatClick}
                masteryLevel={masteryMap[chat.conceptId]?.mastery}
                isLocked={!isUserSubscribed && index >= 1}
                onUpgradeClick={onUpgradeClick}
              />
            ))}
          </div>
        </div>
      )}

      {/* Improve on the Basics */}
      {chatsByMasteryLevel.basics.length > 0 && (
        <div>
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Improve on the Basics 📚</h2>
            <p className="text-sm text-gray-600 mt-1">
              Build a stronger foundation in these concepts
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {chatsByMasteryLevel.basics.map((chat, index) => (
              <ConceptChatCard
                key={`basics-${chat.conceptId}-${index}`}
                chat={chat}
                onClick={onChatClick}
                masteryLevel={masteryMap[chat.conceptId]?.mastery}
                isLocked={!isUserSubscribed && index >= 1}
                onUpgradeClick={onUpgradeClick}
              />
            ))}
          </div>
        </div>
      )}

      {/* Go Advanced */}
      {chatsByMasteryLevel.advanced.length > 0 && (
        <div>
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-900">🚀 Go Advanced</h2>
            <p className="text-sm text-gray-600 mt-1">
              Challenge yourself with more complex problems
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {chatsByMasteryLevel.advanced.map((chat, index) => (
              <ConceptChatCard
                key={`advanced-${chat.conceptId}-${index}`}
                chat={chat}
                onClick={onChatClick}
                masteryLevel={masteryMap[chat.conceptId]?.mastery}
                isLocked={!isUserSubscribed && index >= 1}
                onUpgradeClick={onUpgradeClick}
              />
            ))}
          </div>
        </div>
      )}

      {/* Be the Master */}
      {chatsByMasteryLevel.mastery.length > 0 && (
        <div>
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-900">👑 Be the Master</h2>
            <p className="text-sm text-gray-600 mt-1">
              Perfect your skills and maintain excellence
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {chatsByMasteryLevel.mastery.map((chat, index) => (
              <ConceptChatCard
                key={`mastery-${chat.conceptId}-${index}`}
                chat={chat}
                onClick={onChatClick}
                masteryLevel={masteryMap[chat.conceptId]?.mastery}
                isLocked={!isUserSubscribed && index >= 1}
                onUpgradeClick={onUpgradeClick}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

