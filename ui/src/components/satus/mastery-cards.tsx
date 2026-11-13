interface MasteryCardsProps {
  mathMastery: number;
  englishMastery: number;
}

export function MasteryCards({ mathMastery, englishMastery }: MasteryCardsProps) {
  const getMasteryMessage = (mastery: number) => {
    if (mastery < 30) return "Keep practicing to build your foundation";
    if (mastery < 60) return "You're making good progress!";
    if (mastery < 80) return "Great work! Keep it up";
    return "Excellent mastery level!";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {/* Math Mastery */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Math Mastery</h3>
          <span className="text-3xl font-bold text-gray-700">{mathMastery}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-gray-600 to-gray-700 h-full rounded-full transition-all duration-500"
            style={{ width: `${mathMastery}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 mt-3">
          {getMasteryMessage(mathMastery)}
        </p>
      </div>

      {/* English Mastery */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Reading & Writing Mastery</h3>
          <span className="text-3xl font-bold text-gray-700">{englishMastery}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-gray-600 to-gray-700 h-full rounded-full transition-all duration-500"
            style={{ width: `${englishMastery}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 mt-3">
          {getMasteryMessage(englishMastery)}
        </p>
      </div>
    </div>
  );
}

