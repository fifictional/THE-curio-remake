import { type ConceptChat } from '@/lib/data/sat-concept-chats';
import { Lock, MessageCircle } from 'lucide-react';

interface ConceptChatCardProps {
  chat: ConceptChat;
  onClick: (prompt: string, chat: ConceptChat) => void;
  masteryLevel?: number; // Current mastery level (0-100)
  isLocked?: boolean; // If true, show blur and upgrade overlay
  onUpgradeClick?: () => void; // Callback for upgrade button
}

const COLOR_CLASSES = {
  blue: {
    bg: 'bg-gradient-to-br from-blue-50 to-blue-100',
    border: 'border-blue-200',
    hover: 'hover:border-blue-400 hover:shadow-blue-100',
    text: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-700',
  },
  green: {
    bg: 'bg-gradient-to-br from-green-50 to-green-100',
    border: 'border-green-200',
    hover: 'hover:border-green-400 hover:shadow-green-100',
    text: 'text-green-700',
    badge: 'bg-green-100 text-green-700',
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-50 to-purple-100',
    border: 'border-purple-200',
    hover: 'hover:border-purple-400 hover:shadow-purple-100',
    text: 'text-purple-700',
    badge: 'bg-purple-100 text-purple-700',
  },
  orange: {
    bg: 'bg-gradient-to-br from-orange-50 to-orange-100',
    border: 'border-orange-200',
    hover: 'hover:border-orange-400 hover:shadow-orange-100',
    text: 'text-orange-700',
    badge: 'bg-orange-100 text-orange-700',
  },
  teal: {
    bg: 'bg-gradient-to-br from-teal-50 to-teal-100',
    border: 'border-teal-200',
    hover: 'hover:border-teal-400 hover:shadow-teal-100',
    text: 'text-teal-700',
    badge: 'bg-teal-100 text-teal-700',
  },
  pink: {
    bg: 'bg-gradient-to-br from-pink-50 to-pink-100',
    border: 'border-pink-200',
    hover: 'hover:border-pink-400 hover:shadow-pink-100',
    text: 'text-pink-700',
    badge: 'bg-pink-100 text-pink-700',
  },
};

const MASTERY_LABELS = {
  beginner: 'Beginner',
  improving: 'Improving',
  perfection: 'Perfection',
};

export function ConceptChatCard({ chat, onClick, masteryLevel, isLocked = false, onUpgradeClick }: ConceptChatCardProps) {
  const colors = COLOR_CLASSES[chat.color as keyof typeof COLOR_CLASSES] || COLOR_CLASSES.blue;
  
  // Determine mastery color based on level
  const getMasteryColor = (level: number) => {
    if (level < 40) return '#ef4444'; // red-500
    if (level < 60) return '#f97316'; // orange-500
    if (level < 80) return '#3b82f6'; // blue-500
    return '#22c55e'; // green-500
  };

  const masteryPercentage = masteryLevel !== undefined ? Math.round(masteryLevel) : 50;
  const masteryColor = getMasteryColor(masteryPercentage);
  const circumference = 2 * Math.PI * 16; // radius = 16
  const strokeDashoffset = circumference - (masteryPercentage / 100) * circumference;

  // Generate random placeholder text for locked cards
  const getRandomText = () => {
    const words = ['Practice', 'Learn', 'Master', 'Study', 'Improve', 'Solve', 'Understand', 'Review'];
    return Array.from({ length: 8 }, () => words[Math.floor(Math.random() * words.length)]).join(' ');
  };

  return (
    <div
      className={`bg-white border-2 border-gray-200 rounded-xl p-5 transition-all hover:shadow-lg hover:border-gray-300 text-left w-full relative ${isLocked ? 'overflow-hidden' : ''}`}
    >
      {/* Header with Title and Emoji */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-base text-gray-900">
            {chat.conceptDisplay}
          </h3>
          <span className="text-2xl flex-shrink-0">{chat.emoji}</span>
        </div>
      </div>

      {/* Clickable Prompt Options with Clear CTA */}
      <div className={`space-y-2 mb-4 ${isLocked ? 'blur-sm' : ''}`}>
        {/* <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Ask Curio:
        </p> */}
        {isLocked ? (
          // Show random text for locked cards
          <div className="text-sm px-4 py-2.5 rounded-lg bg-gray-100 text-gray-400">
            {getRandomText()}
          </div>
        ) : (
          chat.prompts.map((prompt, index) => (
            <div
              key={index}
              className="group flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all cursor-pointer border border-gray-200 hover:border-gray-300 hover:shadow-sm"
              onClick={() => onClick(prompt, chat)}
            >
              <span className="flex-1 text-sm text-gray-700 group-hover:text-gray-900">
                {prompt.length > 55 ? `${prompt.substring(0, 55)}...` : prompt}
              </span>
              <button
                className="shrink-0 cursor-pointer p-1.5 rounded-md bg-gray-700 hover:bg-gray-900 text-white transition-colors"
                title="Start chat with Curio"
              >
                <MessageCircle className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer with Badge and Mastery */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-700">
          {MASTERY_LABELS[chat.masteryLevel]}
        </span>
        
        {/* Circular Progress Indicator */}
        {masteryLevel !== undefined && (
          <div className="flex-shrink-0 relative" style={{ width: '40px', height: '40px' }}>
            <svg className="transform -rotate-90" width="40" height="40">
              {/* Background circle */}
              <circle
                cx="20"
                cy="20"
                r="16"
                stroke="#e5e7eb"
                strokeWidth="3"
                fill="none"
              />
              {/* Progress circle */}
              <circle
                cx="20"
                cy="20"
                r="16"
                stroke={masteryColor}
                strokeWidth="3"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-300"
              />
            </svg>
            {/* Percentage text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold" style={{ color: masteryColor }}>
                {masteryPercentage}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Upgrade Overlay for Locked Cards */}
      {isLocked && (
        <div className="absolute inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center rounded-xl">
          <div className="text-center px-4">
            <div className="text-3xl mb-2 flex items-center justify-center"><Lock className="w-10 h-10 text-gray-900 mb-2" /></div>
            <h4 className="font-bold text-gray-900 mb-2">Upgrade to Ultra Curio</h4>
            <p className="text-sm text-gray-600 mb-4">Unlock all practice topics and features</p>
            <button
              onClick={onUpgradeClick}
              className="cursor-pointer bg-gradient-to-r from-gray-700 to-gray-900 text-white font-semibold px-6 py-2 rounded-lg hover:from-gray-800 hover:to-gray-900 transition-all shadow-lg"
            >
              Upgrade Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
