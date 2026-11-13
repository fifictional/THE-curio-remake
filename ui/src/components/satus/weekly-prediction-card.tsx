import { Lock } from 'lucide-react';

interface WeeklyPredictionCardProps {
  isLoading: boolean;
  averageSATScore: number;
  accuracy: number;
  examsCompleted: number;
  onViewProgress: () => void;
  isLocked?: boolean;
}

export function WeeklyPredictionCard({
  isLoading,
  averageSATScore,
  accuracy,
  examsCompleted,
  onViewProgress,
  isLocked = false,
}: WeeklyPredictionCardProps) {
  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-gray-700 to-gray-900 rounded-2xl p-8 text-white mb-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-700 to-gray-900 rounded-2xl p-8 text-white mb-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="mb-6 md:mb-0">
          <h2 className="text-xl font-semibold mb-2 opacity-90">This Week's Prediction</h2>
          <div className="flex items-baseline gap-3">
            <span className="text-5xl font-bold">
              {averageSATScore || '---'}
            </span>
            <span className="text-2xl opacity-75">/ 1600</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="bg-white/20 rounded-full px-3 py-1 flex items-center gap-2">
              <span className="text-sm font-medium">
                🎯 {accuracy || 0}%
              </span>
            </div>
            <span className="text-sm opacity-75">
              ({examsCompleted || 0}/10 mini exams)
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="text-sm opacity-90 max-w-xs">
            {examsCompleted > 0 ? (
              <p>
                Based on {examsCompleted} mini exam{examsCompleted !== 1 ? 's' : ''} this week. 
                Complete {10 - examsCompleted} more for 100% accuracy.
              </p>
            ) : (
              <p>
                Take your first mini exam this week to get a predicted score. 
                Complete 10 mini exams for maximum accuracy.
              </p>
            )}
          </div>
          <button
            onClick={onViewProgress}
            className={`cursor-pointer ${
              isLocked 
                ? 'bg-white/10 hover:bg-white/20' 
                : 'bg-white/20 hover:bg-white/30'
            } text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm w-fit flex items-center gap-2`}
          >
            {isLocked && <Lock className="w-4 h-4" />}
            {isLocked ? 'Unlock Progress History' : 'View Progress History'}
          </button>
        </div>
      </div>
    </div>
  );
}

