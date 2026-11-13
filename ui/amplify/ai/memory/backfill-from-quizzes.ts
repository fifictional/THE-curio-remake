import type { Schema } from '@database-schema';
import { generateClient } from 'aws-amplify/data';
import { v4 as uuidv4 } from 'uuid';
import { extractMemoryFromQuiz } from './extractors/quiz-extractor';
import type { MemoryService } from './memory-service';
import {
  BLOCK_TYPE_KNOWLEDGE_GAP,
  BLOCK_TYPE_MASTERED_TOPIC,
  QUIZ_GAP_SCORE_RATIO,
  QUIZ_MASTERED_MIN_ATTEMPTS,
  QUIZ_MASTERED_SCORE_RATIO,
  ADDED_FROM_QUIZ,
  ADDED_FROM_MOCK_EXAM,
} from './constants';

type DataClient = ReturnType<typeof generateClient<Schema>>;

// v2: backfill now also covers completed mock exams, so users stamped with the
// v1 flag get one more pass (upsertCandidate merges duplicates, so re-running
// the quiz portion is safe).
export const BACKFILL_COMPLETE_META = 'memory_backfill_complete_v2';
export const BACKFILL_BANNER_META = 'memory_backfill_banner';
export const CONSOLIDATION_V2_COMPLETE_META = 'memory_consolidation_v2_complete';

export interface BackfillResult {
  gapsCreated: number;
  masteredCreated: number;
  skipped: boolean;
}

interface AttemptRow {
  quizAttemptUuid: string;
  quizUuid: string;
  score: number;
  total: number;
  createdAt: string;
  topic: string;
  subject?: string;
  documentUuid?: string | null;
  spaceUuid?: string | null;
  addedFrom: typeof ADDED_FROM_QUIZ | typeof ADDED_FROM_MOCK_EXAM;
}

export async function runQuizHistoryBackfill(
  client: DataClient,
  memory: MemoryService,
  ownerUuid: string
): Promise<BackfillResult> {
  const existing = await client.models.Metadata.list({
    filter: {
      targetUuid: { eq: ownerUuid },
      targetType: { eq: 'user' },
      name: { eq: BACKFILL_COMPLETE_META },
    },
    limit: 1,
  });
  if (existing.data?.[0]?.value === 'true') {
    return { gapsCreated: 0, masteredCreated: 0, skipped: true };
  }

  const attemptsRes =
    await client.models.QuizAttempt.listQuizAttemptByUserUuidAndCreatedAt(
      { userUuid: ownerUuid },
      { limit: 500, sortDirection: 'ASC' }
    );

  const quizCache = new Map<string, { title?: string | null; sourceUuid?: string }>();
  const rows: AttemptRow[] = [];

  for (const a of attemptsRes.data ?? []) {
    if (!a.quizUuid || a.total <= 0) continue;
    let quiz = quizCache.get(a.quizUuid);
    if (!quiz) {
      const q = await client.models.Quiz.get({ quizUuid: a.quizUuid });
      quiz = { title: q.data?.title, sourceUuid: q.data?.sourceUuid };
      quizCache.set(a.quizUuid, quiz);
    }
    const topic = quiz.title?.trim() || 'Quiz topic';
    let documentUuid: string | null = null;
    let spaceUuid: string | null = null;
    if (quiz.sourceUuid) {
      const doc = await client.models.Document.get({
        documentUuid: quiz.sourceUuid,
      });
      if (doc.data) {
        documentUuid = doc.data.documentUuid;
        spaceUuid = doc.data.spaceUuid ?? null;
      } else {
        const chat = await client.models.Chat.get({ chatUuid: quiz.sourceUuid });
        if (chat.data) {
          documentUuid = chat.data.documentUuid ?? null;
          spaceUuid = chat.data.spaceUuid ?? null;
        }
      }
    }
    rows.push({
      quizAttemptUuid: a.quizAttemptUuid,
      quizUuid: a.quizUuid,
      score: a.score,
      total: a.total,
      createdAt: a.createdAt,
      topic,
      documentUuid,
      spaceUuid,
      addedFrom: ADDED_FROM_QUIZ,
    });
  }

  // Mock exams (practice tests) live in their own tables and historically never
  // produced memory events, so fold their completed attempts into the same
  // per-topic pipeline. Correct answers are recomputed from questionAnswers
  // because MockExamLog.score uses a scaled point value, not a raw count.
  const examsRes = await client.models.MockExam.listMockExamByUserUuidAndCreatedAt(
    { userUuid: ownerUuid },
    { limit: 200, sortDirection: 'ASC' }
  );

  for (const exam of examsRes.data ?? []) {
    const questions = (exam.questions ?? []).filter(Boolean);
    const total = questions.length;
    if (!exam.mockExamUuid || total === 0) continue;

    const indexToAnswer = new Map<number, number>();
    for (const q of questions) {
      if (q) indexToAnswer.set(q.index, q.answer);
    }

    const logsRes =
      await client.models.MockExamLog.listMockExamLogByMockExamUuidAndStartedAt(
        { mockExamUuid: exam.mockExamUuid },
        { limit: 100, sortDirection: 'ASC' }
      );

    for (const log of logsRes.data ?? []) {
      if (log.status !== 'COMPLETED') continue;
      const correct = (log.questionAnswers ?? []).reduce((acc, qa) => {
        if (!qa || qa.givenAnswer == null) return acc;
        return acc + (indexToAnswer.get(qa.index) === qa.givenAnswer ? 1 : 0);
      }, 0);

      rows.push({
        quizAttemptUuid: log.mockExamLogUuid,
        quizUuid: exam.mockExamUuid,
        score: correct,
        total,
        createdAt: log.completedAt ?? log.createdAt,
        topic: exam.title?.trim() || 'Practice test',
        documentUuid: null,
        spaceUuid: exam.spaceUuid ?? null,
        addedFrom: ADDED_FROM_MOCK_EXAM,
      });
    }
  }

  const byTopic = new Map<string, AttemptRow[]>();
  for (const r of rows) {
    const key = `${r.topic}|${r.spaceUuid ?? ''}|${r.documentUuid ?? ''}`;
    const list = byTopic.get(key) ?? [];
    list.push(r);
    byTopic.set(key, list);
  }

  let gapsCreated = 0;
  let masteredCreated = 0;

  for (const group of byTopic.values()) {
    group.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const lowCount = group.filter(
      (g) => g.score / g.total < QUIZ_GAP_SCORE_RATIO
    ).length;
    const highDays = new Set<string>();
    for (const g of group) {
      if (g.score / g.total >= QUIZ_MASTERED_SCORE_RATIO) {
        highDays.add(g.createdAt.slice(0, 10));
      }
    }

    const last = group[group.length - 1];
    const priorAttempts = group.slice(0, -1).map((g) => ({
      scoreRatio: g.score / g.total,
      createdAt: g.createdAt,
    }));
    const lastIsStrong = last.score / last.total >= QUIZ_MASTERED_SCORE_RATIO;

    // The most recent attempt being strong disproves a gap on this topic,
    // even when it isn't yet enough evidence to record mastery.
    if (lastIsStrong) {
      await memory.resolveGapsForHighScore(ownerUuid, last.topic);
    }

    if (lowCount >= 2 && !lastIsStrong) {
      const candidates = extractMemoryFromQuiz({
        ownerUuid,
        quizUuid: last.quizUuid,
        quizAttemptUuid: last.quizAttemptUuid,
        score: last.score,
        total: last.total,
        topic: last.topic,
        documentUuid: last.documentUuid,
        spaceUuid: last.spaceUuid,
        priorAttempts: [],
        occurredAt: last.createdAt,
      });
      const gap = candidates.find((c) => c.blockType === BLOCK_TYPE_KNOWLEDGE_GAP);
      if (gap) {
        const r = await memory.upsertCandidate({
          ...gap,
          addedFrom: last.addedFrom,
          isBackfill: true,
          confidence: 0.8,
          payload: {
            ...(gap.payload as object),
            evidence: 'quiz_below_60',
            description: `Backfilled from ${lowCount} quiz attempts below 60% on this topic.`,
          },
        });
        if (r.decision === 'created') gapsCreated++;
      }
    }

    if (highDays.size >= QUIZ_MASTERED_MIN_ATTEMPTS) {
      const candidates = extractMemoryFromQuiz({
        ownerUuid,
        quizUuid: last.quizUuid,
        quizAttemptUuid: last.quizAttemptUuid,
        score: last.score,
        total: last.total,
        topic: last.topic,
        documentUuid: last.documentUuid,
        spaceUuid: last.spaceUuid,
        priorAttempts,
        occurredAt: last.createdAt,
      });
      const mastered = candidates.find(
        (c) => c.blockType === BLOCK_TYPE_MASTERED_TOPIC
      );
      if (mastered) {
        const r = await memory.upsertCandidate({
          ...mastered,
          addedFrom: last.addedFrom,
          isBackfill: true,
          confidence: 0.85,
          payload: {
            ...(mastered.payload as object),
            evidence: 'quiz_mastered',
            description: `Backfilled from quiz history (${highDays.size} strong days).`,
          },
        });
        if (r.decision === 'created') masteredCreated++;
      }
    }
  }

  const now = new Date().toISOString();
  await client.models.Metadata.create({
    metadataUuid: uuidv4(),
    targetUuid: ownerUuid,
    targetType: 'user',
    name: BACKFILL_COMPLETE_META,
    value: 'true',
    createdAt: now,
    updatedAt: now,
  });

  if (gapsCreated > 0 || masteredCreated > 0) {
    await client.models.Metadata.create({
      metadataUuid: uuidv4(),
      targetUuid: ownerUuid,
      targetType: 'user',
      name: BACKFILL_BANNER_META,
      value: JSON.stringify({ gaps: gapsCreated, mastered: masteredCreated }),
      createdAt: now,
      updatedAt: now,
    });
  }

  return { gapsCreated, masteredCreated, skipped: false };
}
