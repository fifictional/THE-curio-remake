/**
 * Flashcard and quiz generation.
 *
 * The old app produced these from a chat message through a tool call. Here it is
 * one endpoint with an injected generator: the model call is the only part that
 * needs a key, while the source selection, persistence and shapes can be tested
 * without one. Without `OPENAI_API_KEY` the default generator answers 503 rather
 * than inventing content.
 */

import { asc, eq } from 'drizzle-orm';
import type { Context } from 'hono';
import { z } from 'zod';

import { chat, hasAiKey } from '../ai';
import { asUser } from '../db/scope';
import { documentChunks, flashcards, messages, quizQuestions, quizzes } from '../db/schema';
import { getValidatedBody, validateBody } from '../middleware/validate';
import type { HonoEnv } from '../types';

type Identity = { sub: string } | null;

const GenerateArgs = z.object({
  kind: z.enum(['flashcards', 'quiz']),
  documentUuid: z.string().uuid().nullish(),
  chatUuid: z.string().uuid().nullish(),
  count: z.coerce.number().int().min(3).max(20).default(8),
});

export const generateValidate = validateBody(GenerateArgs);

export interface GeneratedCard {
  title: string;
  content: string;
}

export interface GeneratedQuestion {
  question: string;
  options: string[];
  answer: number;
  explanations?: string[];
}

export interface Generator {
  (input: { kind: 'flashcards' | 'quiz'; source: string; count: number }): Promise<{
    cards?: GeneratedCard[];
    questions?: GeneratedQuestion[];
  }>;
}

/** Pulls JSON out of a model reply, tolerating fences and prose around it. */
export function parseJsonReply<T>(reply: string): T | null {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(reply);
  const candidate = (fenced?.[1] ?? reply).trim();
  const start = candidate.search(/[[{]/);
  if (start < 0) return null;
  const end = Math.max(candidate.lastIndexOf('}'), candidate.lastIndexOf(']'));
  if (end < start) return null;

  try {
    return JSON.parse(candidate.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

export const defaultGenerator: Generator = async ({ kind, source, count }) => {
  const instruction =
    kind === 'flashcards'
      ? `Create ${count} study flashcards from the material. Reply with JSON only: {"cards":[{"title":"...","content":"..."}]}`
      : `Create a ${count}-question multiple-choice quiz from the material. "answer" is the 0-based index of the correct option. Reply with JSON only: {"questions":[{"question":"...","options":["...","...","...","..."],"answer":0,"explanations":["..."]}]}`;

  const reply = await chat([
    { role: 'system', content: instruction },
    { role: 'user', content: source.slice(0, 12_000) },
  ]);

  const parsed = parseJsonReply<{ cards?: GeneratedCard[]; questions?: GeneratedQuestion[] }>(reply);
  if (!parsed) throw new Error('The model did not return usable JSON');
  return parsed;
};

/** Source text for generation: a document's chunks, or a chat's messages. */
async function sourceText(userId: string, input: z.infer<typeof GenerateArgs>) {
  return asUser(userId, async (db) => {
    if (input.documentUuid) {
      const rows = await db
        .select({ text: documentChunks.text })
        .from(documentChunks)
        .where(eq(documentChunks.documentUuid, input.documentUuid))
        .orderBy(asc(documentChunks.chunkIndex))
        .limit(20);
      return rows.map((row) => row.text).join('\n\n');
    }

    const rows = await db
      .select({ content: messages.content })
      .from(messages)
      .where(eq(messages.chatUuid, input.chatUuid!))
      .orderBy(asc(messages.createdAt))
      .limit(40);
    return rows.map((row) => row.content).join('\n\n');
  });
}

export function createGenerateRoutes(generate: Generator = defaultGenerator) {
  const handler = async (c: Context<HonoEnv>): Promise<Response> => {
    const identity = c.var.identity as Identity;
    if (!identity) return c.json({ success: false, error: 'Not signed in' }, 401);

    if (generate === defaultGenerator && !hasAiKey()) {
      return c.json(
        {
          success: false,
          error: 'Generation needs OPENAI_API_KEY — set it in .env and restart the API.',
        },
        503,
      );
    }

    const input = getValidatedBody<typeof GenerateArgs>(c);
    if (!input.documentUuid && !input.chatUuid) {
      return c.json({ success: false, error: 'documentUuid or chatUuid is required' }, 400);
    }

    const source = await sourceText(identity.sub, input);
    if (!source.trim()) {
      return c.json({ success: false, error: 'Nothing to generate from yet' }, 400);
    }

    let generated;
    try {
      generated = await generate({ kind: input.kind, source, count: input.count });
    } catch (err) {
      return c.json({ success: false, error: (err as Error).message }, 502);
    }

    if (input.kind === 'flashcards') {
      const cards = (generated.cards ?? []).filter((card) => card?.title && card?.content);
      if (!cards.length) return c.json({ success: false, error: 'No cards were produced' }, 502);

      const saved = await asUser(identity.sub, (db) =>
        db
          .insert(flashcards)
          .values(
            cards.map((card) => ({
              flashcardUuid: crypto.randomUUID(),
              userUuid: identity.sub,
              documentUuid: input.documentUuid ?? null,
              chatUuid: input.chatUuid ?? null,
              title: card.title.slice(0, 300),
              content: card.content.slice(0, 4000),
            })),
          )
          .returning(),
      );

      return c.json({ success: true, kind: 'flashcards', created: saved.length, flashcards: saved });
    }

    const questions = (generated.questions ?? []).filter(
      (question) =>
        question?.question && Array.isArray(question.options) && question.options.length >= 2,
    );
    if (!questions.length) return c.json({ success: false, error: 'No questions were produced' }, 502);

    const saved = await asUser(identity.sub, async (db) => {
      const [quiz] = await db
        .insert(quizzes)
        .values({
          quizUuid: crypto.randomUUID(),
          userUuid: identity.sub,
          title: 'Generated quiz',
          difficulty: 'medium',
          sourceType: input.documentUuid ? 'document' : 'chat',
          sourceUuid: input.documentUuid ?? input.chatUuid!,
          questionCount: questions.length,
        })
        .returning();

      const rows = await db
        .insert(quizQuestions)
        .values(
          questions.map((question) => ({
            quizQuestionUuid: crypto.randomUUID(),
            quizUuid: quiz.quizUuid,
            userUuid: identity.sub,
            sourceType: input.documentUuid ? 'document' : 'chat',
            sourceUuid: input.documentUuid ?? input.chatUuid!,
            questionContent: question.question.slice(0, 4000),
            options: question.options.map((option) => String(option).slice(0, 500)),
            answer: Number.isInteger(question.answer) ? question.answer : null,
            answerExplanations: (question.explanations ?? []).map((text) => String(text)),
          })),
        )
        .returning();

      return { quiz, questions: rows };
    });

    return c.json({
      success: true,
      kind: 'quiz',
      created: saved.questions.length,
      quiz: saved.quiz,
      questions: saved.questions,
    });
  };

  return { handler };
}
