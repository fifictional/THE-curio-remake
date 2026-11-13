import { useMockExamsByUserApi } from "@/hooks/api/mock-exams/use-mock-exams-by-user.api";
import { useSessionContext } from "@/providers";
import type { MockExamLog } from "@/lib/types/mock-exam";
import { CurioLoading } from "@/components/ui/curio-loading";
import { MockExamListItem } from "@/components/mock-exams/mock-exam-list-item";

const getStatus = (creationStatus: string, logs: MockExamLog[] | undefined): string => {
  if (creationStatus === 'CREATED') return 'CREATED';
  if (creationStatus === 'GENERATING') return 'GENERATING';
  
  if (creationStatus === 'GENERATED') {
    if (!logs || logs.length === 0) return 'never started';
    // If any log has unanswered questions (givenAnswer empty), consider in progress; otherwise completed
    return logs[0]?.status === 'IN_PROGRESS' ? `In progress (${logs[0]?.questionAnswers.length} answered)` : 'Completed';
  }

  if (creationStatus === 'FAILED') {
    return 'Failed';
  }

  return 'Unknown';
};

const getRemainingMs = (totalTimeInSeconds?: number, startedAt?: string | null): number | null => {
  if (!totalTimeInSeconds || totalTimeInSeconds <= 0) return null;
  if (!startedAt) return totalTimeInSeconds;
  const started = new Date(startedAt).getTime();
  const elapsed = Math.max(Date.now() - started, 0);
  return Math.max((totalTimeInSeconds * 1000) - elapsed, 0);
};

export function MockExamListAsTab() {
  const { userAttributes, userProfile } = useSessionContext();
  // Real data (kept for later). Using static list below to test UI.
  const { mockExams, isLoading } = useMockExamsByUserApi({
    userUuid: userAttributes?.userUuid || null,
  });

  const freeSATMockExamUuid = userProfile?.freeSATMockExamUuid;

  return (
    <div className="flex flex-col gap-4 h-full">
      {isLoading && <CurioLoading />}
      {!isLoading && mockExams.length === 0 && <div className="p-4 text-sm text-muted-foreground">No mock exams yet.</div>}
      {mockExams.filter((exam) => !!exam).map((exam, idx) => {
        const status = getStatus(exam.creationStatus, exam.mockExamLogs);
        const totalTimeInSeconds = (exam as any).mockExamInfo?.time as number | undefined;
        const latestLog = exam.mockExamLogs?.[0] as any;
        const startedAt = latestLog?.startedAt as string | undefined;
        const remaining = status === 'in progress' ? getRemainingMs(totalTimeInSeconds, startedAt) : null;
        const isFreeTrial = exam.mockExamUuid === freeSATMockExamUuid;
        return (
          <MockExamListItem
            key={exam.mockExamUuid}
            exam={exam as any}
            status={status}
            remainingMs={status === 'in progress' ? remaining : null}
            createdAtLabel={new Date(exam.createdAt).toLocaleString()}
            animationDelay={idx * 0.03}
            isFreeTrial={isFreeTrial}
          />
        );
      })}
    </div>
  );
}