import { RecentExamCard } from './recent-exam-card';

interface ExamLog {
  satMiniExamLogUuid: string;
  status: string;
  predictedSATScore: number;
  startedAt: string;
  totalCorrect: number;
  totalQuestions: number;
  totalAnswered: number;
}

interface RecentExamsSectionProps {
  isLoading: boolean;
  recentExams: ExamLog[];
  hasReachedDailyLimit: boolean;
  onTakeExam: () => void;
  onUpgrade: () => void;
}

export function RecentExamsSection({
  isLoading,
  recentExams,
  hasReachedDailyLimit,
  onTakeExam,
  onUpgrade,
}: RecentExamsSectionProps) {
  // Check if there's an in-progress exam
  const inProgressExam = recentExams.find(exam => 
    exam.status === 'IN_PROGRESS' || exam.status === 'CREATED'
  );

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Recent Mini Exams</h2>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-gray-100 rounded-xl h-32 animate-pulse"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {recentExams.map((exam, index) => {
            // Only calculate delta for completed exams
            // previousExam is the one that came before (older) in the reversed array
            const previousExam = recentExams[index - 1];
            const delta = (exam.status === 'COMPLETED' && previousExam?.status === 'COMPLETED') 
              ? exam.predictedSATScore - previousExam.predictedSATScore 
              : 0;
            const showDelta = exam.status === 'COMPLETED' && previousExam?.status === 'COMPLETED';

            return (
              <RecentExamCard
                key={exam.satMiniExamLogUuid}
                examUuid={exam.satMiniExamLogUuid}
                status={exam.status}
                score={exam.predictedSATScore}
                startedAt={exam.startedAt}
                correctAnswers={exam.totalCorrect}
                totalAnswered={exam.totalAnswered}
                totalQuestions={exam.totalQuestions}
                delta={delta}
                showDelta={false}
                colorIndex={index}
              />
            );
          })}
          
          {/* CTA Card */}
          {inProgressExam ? (
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-300 rounded-xl p-6 flex flex-col items-center justify-center text-center min-h-[8rem]">
              <div className="text-4xl mb-2">⏳</div>
              <div className="text-sm font-bold text-orange-900 mb-1">
                Exam In Progress
              </div>
              <div className="text-xs text-orange-700">
                Complete your current exam first
              </div>
            </div>
          ) : hasReachedDailyLimit ? (
            <button
              onClick={onUpgrade}
              className="bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-400 rounded-xl p-6 hover:from-gray-200 hover:to-gray-300 transition-all flex flex-col items-center justify-center text-center min-h-[8rem] cursor-pointer"
            >
              <div className="text-4xl mb-2">🔒</div>
              <div className="text-sm font-bold text-gray-900 mb-1">
                Upgrade to Ultra Curio
              </div>
              <div className="text-xs text-gray-600">
                Take unlimited exams daily
              </div>
            </button>
          ) : (
            <button
              onClick={onTakeExam}
              className="cursor-pointer bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-xl p-6 hover:from-gray-100 hover:to-gray-200 transition-all flex flex-col items-center justify-center text-center min-h-[8rem]"
            >
              <div className="text-4xl mb-2">📝</div>
              <div className="text-sm font-semibold text-gray-900 mb-1">
                Take Another Exam
              </div>
              <div className="text-xs text-gray-600">
                Track your progress
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

