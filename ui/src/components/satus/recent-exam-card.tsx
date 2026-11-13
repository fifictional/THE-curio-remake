import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAnalytics } from '@/providers/analytics-provider';

interface RecentExamCardProps {
  examUuid: string;
  status: string;
  score: number;
  startedAt: string;
  correctAnswers: number;
  totalAnswered: number;
  totalQuestions: number;
  delta?: number;
  showDelta?: boolean;
  colorIndex: number;
}

const COLOR_SCHEMES = [
  {
    border: 'border-blue-200',
    hoverBorder: 'hover:border-blue-400',
    bg: 'bg-gradient-to-br from-blue-50 to-blue-100',
    scoreBg: 'bg-blue-600',
    scoreText: 'text-blue-600',
  },
  {
    border: 'border-purple-200',
    hoverBorder: 'hover:border-purple-400',
    bg: 'bg-gradient-to-br from-purple-50 to-purple-100',
    scoreBg: 'bg-purple-600',
    scoreText: 'text-purple-600',
  },
  {
    border: 'border-indigo-200',
    hoverBorder: 'hover:border-indigo-400',
    bg: 'bg-gradient-to-br from-indigo-50 to-indigo-100',
    scoreBg: 'bg-indigo-600',
    scoreText: 'text-indigo-600',
  },
];

export function RecentExamCard({
  examUuid,
  status,
  score,
  startedAt,
  correctAnswers,
  totalAnswered,
  totalQuestions,
  delta = 0,
  showDelta = false,
  colorIndex,
}: RecentExamCardProps) {
  const router = useRouter();
  const { track } = useAnalytics();
  const colors = COLOR_SCHEMES[colorIndex] || COLOR_SCHEMES[0];
  const isInProgress = status === 'IN_PROGRESS' || status === 'CREATED';

  const handleClick = () => {
    track('sat_exam_card_clicked', {
      exam_uuid: examUuid,
      status: status,
      is_in_progress: isInProgress,
      score: score,
      total_answered: totalAnswered,
      total_questions: totalQuestions,
      correct_answers: correctAnswers,
      delta: delta,
      action: isInProgress ? 'continue' : 'view_details',
    });
    router.push(`/satus/take/${examUuid}`);
  };

  return (
    <div
      onClick={handleClick}
      className={`${colors.bg} border-2 ${colors.border} ${colors.hoverBorder} rounded-xl p-6 transition-all hover:shadow-lg cursor-pointer`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-700">
          {new Date(startedAt).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          })}
        </span>
        {isInProgress ? (
          <div className="flex items-center gap-1 text-sm font-bold px-2 py-1 rounded-full bg-orange-100 text-orange-700">
            <span className="text-xs">In Progress</span>
          </div>
        ) : showDelta && (
          <div className={`flex items-center gap-1 text-sm font-bold px-2 py-1 rounded-full ${
            delta > 0 
              ? 'bg-green-100 text-green-700' 
              : delta < 0 
              ? 'bg-red-100 text-red-700' 
              : 'bg-gray-100 text-gray-700'
          }`}>
            {delta > 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : delta < 0 ? (
              <TrendingDown className="w-3 h-3" />
            ) : (
              <Minus className="w-3 h-3" />
            )}
            <span className="text-xs">{delta > 0 ? '+' : ''}{delta}</span>
          </div>
        )}
      </div>
      <div className="mb-3">
        {isInProgress ? (
          <>
            <div className={`text-4xl font-bold ${colors.scoreText}`}>
              {totalAnswered}/{totalQuestions}
            </div>
            <div className="text-sm text-gray-600 font-medium">answered</div>
          </>
        ) : (
          <>
            <div className={`text-4xl font-bold ${colors.scoreText}`}>{score}
            <span className={`text-sm ${colors.scoreText} font-bold`}>/ 1600</span>
            </div>
          </>
        )}
      </div>
      {!isInProgress && (
        <>
          <div className={`inline-flex items-center gap-1 py-1 rounded-full bg-opacity-10 mb-2`}>
            <span className={`text-sm font-bold ${colors.scoreText}`}>
              {correctAnswers}/{totalQuestions}
            </span>
            <span className="text-xs text-gray-600">correct</span>
          </div>
          <div className="text-xs font-medium text-gray-500 mt-2">
            Click to view details →
          </div>
        </>
      )}
      {isInProgress && (
        <div className="text-sm font-semibold text-gray-700">
          Click to continue →
        </div>
      )}
    </div>
  );
}

