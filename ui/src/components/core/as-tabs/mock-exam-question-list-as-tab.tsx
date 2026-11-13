"use client";

import { useMockExamByIdApi } from "@/hooks/api/mock-exams/use-mock-exam-by-id.api";
import { useMockExamsAttemptsByMockExam } from "@/hooks/api/mock-exams/use-mock-exam-logs-by-mock-exam.api";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CurioMarkdown } from "@/components/core/curio-markdown";
import { Check, X, ShoppingCart } from "lucide-react";
import { useSessionContext } from "@/providers/session-provider";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useAnalytics } from "@/providers";

export function MockExamQuestionListAsTab() {
  const { mockExamUuid } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { userProfile } = useSessionContext();
  const { data: mockExam } = useMockExamByIdApi({ mockExamUuid: mockExamUuid as string });
  const { mockExamLogs } = useMockExamsAttemptsByMockExam({ mockExamUuid: mockExamUuid as string });
  const { track } = useAnalytics();

  const questions = mockExam?.questions || [];
  const answers = mockExamLogs?.[0]?.questionAnswers || [];

  const indexToAnswer = new Map<number, number | null>((answers || []).map((ans) => [ans!.index, ans!.givenAnswer ?? null]));
  const currentIndex = (() => {
    const q = searchParams.get('question');
    const n = q != null ? parseInt(q, 10) : 0;
    return Number.isFinite(n) && n >= 0 ? n : 0;
  })();

  const isFreeTrial = useMemo(() => {
    return userProfile?.freeSATMockExamUuid === mockExamUuid;
  }, [userProfile?.freeSATMockExamUuid, mockExamUuid]);

  return (
    <div className="flex flex-col gap-2 pt-2 h-full">
      {questions.map((q) => {
        const given = indexToAnswer.get(q.index);
        const isAnswered = given != null;
        const isCorrect = isAnswered && given === q.answer;
        const stateClasses = !isAnswered
          ? 'border-gray-200 hover:bg-muted'
          : isCorrect
            ? 'border-green-500 bg-green-50'
            : 'border-red-500 bg-red-50';
        const isSelected = q.index === currentIndex;
        const selectedClasses = isSelected
          ? (!isAnswered
              ? 'bg-gray-100 border-gray-400'
              : isCorrect
                ? 'bg-green-100 border-green-600'
                : 'bg-red-100 border-red-600')
          : '';
        return (
          <Link
            key={q.index}
            href={`/mock-exams/${mockExamUuid}?question=${q.index}`}
            className={`flex items-center justify-between rounded-md border px-3 py-2 text-xs transition-colors ${stateClasses} ${selectedClasses} ${isSelected ? 'ring-2 ring-gray-400 ring-offset-1' : ''}`}
          >
            <div className="flex-1 min-w-0 truncate text-gray-800">
              {<CurioMarkdown content={`${q.index + 1} . ${q.questionContent}`} />}
            </div>
            {isAnswered && (
              <div className="ml-3 shrink-0">
                {isCorrect ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <X className="h-4 w-4 text-red-600" />
                )}
              </div>
            )}
          </Link>
        );
      })}
      
      {isFreeTrial && (
        <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
          <h3 className="text-sm font-semibold mb-2 text-center">Love the questions?</h3>
          <p className="text-xs text-muted-foreground mb-3 text-center">
            Get unlimited access to the full SAT question bank
          </p>
          <Button 
            onClick={() => {
              router.push('/sat-us-exam-bundle');
              track('mock_exam_question_list_as_tab_buy_bundle_clicked');
            }}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm"
            size="sm"
          >
            <ShoppingCart className="w-3 h-3 mr-2" />
            Buy Bundle - $49
          </Button>
        </div>
      )}
    </div>
  );
}