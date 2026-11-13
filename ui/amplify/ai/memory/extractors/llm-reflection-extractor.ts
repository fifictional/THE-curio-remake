import type { MemoryCandidateInput, MemoryQueueEvent } from '../types';
import {
  BLOCK_TYPE_KNOWLEDGE_GAP,
  BLOCK_TYPE_MASTERED_TOPIC,
  MIN_CONFIDENCE_TO_STORE,
} from '../constants';

export interface LlmReflectionInput {
  ownerUuid: string;
  scope: 'user' | 'folder' | 'file';
  scopeId: string;
  userTurn: string;
  assistantTurn: string;
  messageUuid?: string;
  chatUuid?: string;
  documentUuid?: string;
  sources?: string[];
  occurredAt?: string;
}

export function buildReflectionUserContent(
  event: MemoryQueueEvent,
  opts?: { priorQuizAttempts?: Array<{ scoreRatio: number; createdAt: string }> }
): string | null {
  if (event.type === 'chat_interaction') {
    const user = event.userTurn.trim();
    const assistant = event.assistantTurn.trim().slice(0, 2000);
    if (!user && !assistant) return null;
    return [
      'Event: chat_interaction',
      `User: ${user || '(empty)'}`,
      `Assistant: ${assistant || '(empty)'}`,
    ].join('\n\n');
  }

  if (event.type === 'quiz_attempt') {
    const ratio = event.total > 0 ? event.score / event.total : 0;
    const pct = Math.round(ratio * 100);
    const prior = opts?.priorQuizAttempts ?? [];
    const priorLines =
      prior.length > 0
        ? prior
            .slice(0, 8)
            .map(
              (p, i) =>
                `  attempt ${i + 1}: ${Math.round(p.scoreRatio * 100)}% at ${p.createdAt}`
            )
            .join('\n')
        : '  (none on record for this quiz)';

    return [
      'Event: quiz_attempt',
      `Topic: ${event.topic}`,
      event.subject ? `Subject: ${event.subject}` : '',
      `Score: ${event.score}/${event.total} (${pct}%)`,
      `Prior attempts on this quiz:\n${priorLines}`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  return null;
}

export function reflectionContextFromEvent(
  event: MemoryQueueEvent
): LlmReflectionInput {
  const scope = event.spaceUuid ? 'folder' : 'user';
  const scopeId = event.spaceUuid ?? event.ownerUuid;

  if (event.type === 'chat_interaction') {
    return {
      ownerUuid: event.ownerUuid,
      scope,
      scopeId,
      userTurn: event.userTurn,
      assistantTurn: event.assistantTurn,
      messageUuid: event.messageUuid,
      chatUuid: event.chatUuid,
      documentUuid: event.documentUuids?.[0],
      occurredAt: event.occurredAt,
    };
  }

  return {
    ownerUuid: event.ownerUuid,
    scope,
    scopeId,
    userTurn: '',
    assistantTurn: '',
    sources: [event.quizAttemptUuid],
    documentUuid: event.documentUuid ?? undefined,
    occurredAt: event.occurredAt,
  };
}

export function parseLlmReflectionResponse(
  raw: string,
  ctx: LlmReflectionInput
): MemoryCandidateInput[] {
  let parsed: { candidates?: Array<Record<string, unknown>> };
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch?.[0] ?? raw);
  } catch {
    return [];
  }

  const out: MemoryCandidateInput[] = [];
  for (const c of parsed.candidates ?? []) {
    const blockType = String(c.blockType ?? '');
    if (
      blockType !== BLOCK_TYPE_KNOWLEDGE_GAP &&
      blockType !== BLOCK_TYPE_MASTERED_TOPIC
    ) {
      continue;
    }
    const topic = String(c.topic ?? '').trim();
    if (!topic) continue;
    const confidence = Number(c.confidence ?? 0);
    if (confidence < MIN_CONFIDENCE_TO_STORE) continue;

    const sources =
      ctx.sources?.length
        ? ctx.sources
        : ctx.messageUuid
          ? [ctx.messageUuid]
          : [];

    const confirmedAt = ctx.occurredAt ?? new Date().toISOString();

    out.push({
      ownerUuid: ctx.ownerUuid,
      scope: ctx.scope,
      scopeId: ctx.scopeId,
      blockType,
      topic,
      subject: c.subject ? String(c.subject) : undefined,
      documentUuid: ctx.documentUuid,
      confidence,
      messageUuid: ctx.messageUuid,
      chatUuid: ctx.chatUuid,
      sources,
      payload: {
        topic,
        subject: c.subject ? String(c.subject) : undefined,
        documentUuid: ctx.documentUuid,
        askedCount: blockType === BLOCK_TYPE_KNOWLEDGE_GAP ? 1 : undefined,
        evidence: 'llm_reflection',
        description: c.description
          ? String(c.description).slice(0, 280)
          : undefined,
        accuracy: typeof c.accuracy === 'number' ? c.accuracy : undefined,
        confirmedAt:
          blockType === BLOCK_TYPE_MASTERED_TOPIC
            ? confirmedAt
            : undefined,
      },
    });
  }
  return out.slice(0, 2);
}

export const MEMORY_REFLECTION_PROMPT = `You are the persistent memory agent for a tutoring product. After each learner event, decide what (if anything) should be stored for future sessions.

Block types you may propose:

knowledge_gap — the learner does not yet know a topic well. Signals include:
  - Explicit struggle ("I don't know", "I'm confused", "I'm bad at", "I forgot")
  - Asking introductory or open-ended questions about a topic ("tell me about X",
    "how does X work?", "what is X?", "lets start from X") — the user is asking
    because they don't already know. Treat this as a soft gap on that topic.
  - Repeating the same question, asking for re-explanation, or follow-up
    clarifying questions on the same concept.
  - Weak/incorrect answers in chat or low quiz scores.

mastered_topic — the learner demonstrates clear, confident understanding. Signals include:
  - The learner explains the concept correctly back in their own words.
  - Strong or repeated quiz performance on the same topic.
  - The learner states confidence ("I already know X", "I can do this").

Return {"candidates": []} ONLY when there is genuinely no durable learning signal —
greetings, logistics, profile/UI questions ("do you have info about me?"), or
vague chit-chat with no academic topic.

Guidelines:
- Infer the academic topic from the FULL exchange (user turn + assistant turn),
  not only the user's exact words. If the assistant taught about
  "Indus Valley trade", the topic for a gap is "Indus Valley trade", even if the
  user just asked "what did they sell?".
- A learner exploring a new topic for the first time IS a knowledge_gap signal
  (confidence 0.55–0.70). Confidence rises with stronger struggle signals.
- Requests to CREATE study materials ("make me a practice test on X",
  "generate a quiz about X", "create flashcards for X") are NOT gap signals by
  themselves — the learner may be revising a topic they already know. Store
  nothing for bare creation requests; wait for their actual performance.
- Prefer concrete, narrow topic labels ("Indus Valley trade goods") over broad
  ones ("History"). Set "subject" to the broader subject ("History",
  "Biology", "Math") when obvious.
- NEVER use umbrella labels that summarize a whole domain or course
  ("UK university operations", "Math basics", "Science"). Name the specific
  concept, law, organisation, or skill actually discussed ("Office for
  Students (OfS)", "Higher Education and Research Act 2017", "Solving linear
  equations"). If the exchange covers two distinct concepts, emit two
  candidates with specific labels instead of one merged umbrella label.
- Use correct orthography in topic labels: title case for proper nouns and
  key terms ("Harry Potter Spells", not "Harry potter spells"). For case-law
  names, capitalize every word ("Butler Machine Tool Co Ltd v Ex-Cell-O Corp").
- For quiz_attempt events, use score and prior attempts with your judgment — do
  not apply fixed percentage rules.
- Max 2 candidates per event. confidence 0.55–1.0.

Respond with JSON only, no prose, no markdown fences:
{
  "candidates": [
    {
      "blockType": "knowledge_gap" | "mastered_topic",
      "topic": "short specific topic label",
      "subject": "broader subject (optional)",
      "confidence": 0.65,
      "description": "one sentence evidence drawn from the exchange"
    }
  ]
}`;
