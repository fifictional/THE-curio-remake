"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, Medal, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { ActionMenu } from "@/components/ui/action-menu";
import type { MockExam } from "@/lib/types/mock-exam";
import { useAnalytics } from "@/providers";
import { formatMs, timeAgo } from "@/lib/utils/dates";
import { useDeleteMockExamApi } from "@/hooks/api/mock-exams/use-delete-mock-exam.api";
import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";

interface MockExamListItemProps {
  exam: MockExam;
  status: string;
  remainingMs: number | null;
  createdAtLabel: string;
  animationDelay?: number;
  isFreeTrial?: boolean;
}

function medalColor(pct: number): string | null {
  if (pct >= 100) return '#f59e0b'; // gold
  if (pct >= 95) return '#9ca3af'; // silver (gray-400)
  if (pct >= 80) return '#b45309'; // bronze
  return null;
}

export function MockExamListItem({ exam, status, remainingMs, createdAtLabel, animationDelay = 0, isFreeTrial = false }: MockExamListItemProps) {
  const { track } = useAnalytics();
  const [isDeleting, setIsDeleting] = useState(false);

  const { mutateAsync: deleteMockExam } = useDeleteMockExamApi();

  const logs = (exam.mockExamLogs || []) as any[];
  const latest = logs[0];

  const totalQuestions = (exam.questions || []).length;
  const answeredCount: number = latest?.questionAnswers.length ?? 0;

  const indexToAnswer = new Map<number, number>((exam.questions || []).map((q: any) => [q.index, q.answer]));

  const correctCount: number = (latest?.questionAnswers || []).reduce((acc: number, a: any) => {
    const expected = indexToAnswer.get(a.index);
    return acc + (expected != null && a.givenAnswer === expected ? 1 : 0);
  }, 0);
  const correctPct = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const score: number | null = typeof latest?.score === 'number' ? latest.score : null;
  const statusNorm = status.toLowerCase();
  const startedAt = latest?.startedAt ? new Date(latest.startedAt) : null;
  const completedAt = latest?.completedAt ? new Date(latest.completedAt) : null;

  const showImprove = statusNorm === 'completed' && correctPct <= 70;
  const showRecall = statusNorm === 'completed' && correctPct <= 100;

  const statusAccent = statusNorm === 'completed' ? 'bg-green-500/50' : statusNorm.includes('progress') ? 'bg-amber-500/50' : 'bg-gray-300';

  const onDelete = useCallback(async () => {
    track('mock-exam-list-delete-clicked', { mockExamUuid: exam.mockExamUuid });
    setIsDeleting(true);
    await deleteMockExam(exam.mockExamUuid);
    setIsDeleting(false);
  }, [deleteMockExam, exam.mockExamUuid, track]);

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut', delay: animationDelay }}
    >
      {isDeleting && (
        <div className="absolute inset-0 bg-black/50 z-10 rounded-xl">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      )}
      <Link href={`/mock-exams/${exam.mockExamUuid}`} onClick={() => {
        track('mock-exam-list-clicked', { mockExamUuid: exam.mockExamUuid, status });
      }} className="relative block rounded-xl border bg-white hover:shadow-md transition-shadow overflow-hidden">
        <div className="absolute left-0 top-0 h-full w-1" aria-hidden>
          <div className={cn('h-full w-full', statusAccent)} />
        </div>
        <div className="relative p-4 pl-5 pr-14">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm md:text-base truncate flex items-center gap-2">
                <span className="truncate">{exam.title}</span>
                {isFreeTrial && (
                  <Badge variant="secondary" className="shrink-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Free Trial
                  </Badge>
                )}
                {statusNorm === 'created' && (
                  <span className="inline-flex items-center rounded-full bg-green-700 px-3 py-1 text-xs font-medium text-white">Created</span>
                )}
                {statusNorm === 'generating' && (
                  <span className="inline-flex items-center rounded-full bg-yellow-700 px-3 py-1 text-xs font-medium text-white">Generating</span>
                )}
                {statusNorm === 'completed' && medalColor(correctPct) && (
                  <Medal className="h-5 w-5 shrink-0" style={{ color: medalColor(correctPct) || undefined }} />
                )}
              </div>
              <div className="mt-1 text-[11px] md:text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                {statusNorm === 'never started' && (
                  <span title={createdAtLabel}>Created: {timeAgo(new Date(exam.createdAt))}</span>
                )}
                {statusNorm.includes('progress') && (
                  <>
                    <span title={startedAt?.toLocaleString() || undefined}>In progress: {startedAt ? timeAgo(startedAt) : '—'}</span>
                    <span>• {answeredCount}/{totalQuestions} ({totalQuestions ? Math.round((answeredCount/totalQuestions)*100) : 0}%)</span>
                    {remainingMs != null && <span>•  Time left: {formatMs(remainingMs)}</span>}
                  </>
                )}
                {statusNorm === 'completed' && (
                  <>
                    <span title={completedAt?.toLocaleString() || undefined}>Completed: {completedAt ? timeAgo(completedAt) : '—'}</span>
                    {score != null && <span>•  Score: {score}</span>}
                    <span>•  Correct: {correctPct}%</span>
                  </>
                )}
              </div>
            </div>
          </div>
          {/* Footer CTAs to avoid overlap with action menu */}
          <div className="mt-2 flex items-center gap-2">
            {statusNorm === 'never started' && (
              <span className="inline-flex items-center rounded-full bg-green-700 px-3 py-1 text-xs font-medium text-white">Start</span>
            )}
            {statusNorm.includes('progress') && (
              <span className="inline-flex items-center rounded-full bg-green-700 px-3 py-1 text-xs font-medium text-white">Continue</span>
            )}
            {showImprove && (
              <span onClick={(e) => { e.preventDefault(); track('mock-exam-improve-clicked', { mockExamUuid: exam.mockExamUuid }); }} className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50">Improve</span>
            )}
            {showRecall && !showImprove && (
              <span onClick={(e) => { e.preventDefault(); track('mock-exam-recall-clicked', { mockExamUuid: exam.mockExamUuid }); }} className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50">Recall</span>
            )}
          </div>
        </div>
      </Link>

      {!isFreeTrial && (
        <div className="absolute top-1.5 right-1.5">
          <ActionMenu
            item={exam}
            actions={["delete"]}
            canDelete
            canMove={false}
            canRename={false}
            onDelete={onDelete}
          />
        </div>
      )}
    </motion.div>
  );
}


