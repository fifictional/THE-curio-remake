import type { MemoryCandidateInput } from '../types';
import { BLOCK_TYPE_KNOWLEDGE_GAP } from '../constants';

const CONFUSION_PATTERNS = [
  /\b(?:don'?t|do not)\s+understand\b/i,
  /\bstruggling\s+with\b/i,
  /\bconfused\s+(?:about|by|with)\b/i,
  /\bstill\s+don'?t\s+get\b/i,
  /\bcan'?t\s+figure\s+out\b/i,
];

export function extractExplicitConfusion(
  userTurn: string,
  ctx: {
    ownerUuid: string;
    scopeId: string;
    scope: 'user' | 'folder' | 'file';
    topicHint?: string;
    subject?: string;
    documentUuid?: string;
    messageUuid?: string;
    chatUuid?: string;
  }
): MemoryCandidateInput | null {
  if (!CONFUSION_PATTERNS.some((p) => p.test(userTurn))) return null;

  const topic =
    ctx.topicHint?.trim() ||
    inferTopicFromMessage(userTurn) ||
    'General topic';

  return {
    ownerUuid: ctx.ownerUuid,
    scope: ctx.scope,
    scopeId: ctx.scopeId,
    blockType: BLOCK_TYPE_KNOWLEDGE_GAP,
    topic,
    subject: ctx.subject,
    documentUuid: ctx.documentUuid,
    confidence: 0.75,
    messageUuid: ctx.messageUuid,
    chatUuid: ctx.chatUuid,
    sources: ctx.messageUuid ? [ctx.messageUuid] : [],
    payload: {
      topic,
      subject: ctx.subject,
      documentUuid: ctx.documentUuid,
      askedCount: 1,
      evidence: 'explicit_confusion',
      description: userTurn.slice(0, 280),
    },
  };
}

function inferTopicFromMessage(text: string): string {
  const m = text.match(
    /(?:understand|struggling with|confused (?:about|by|with))\s+(.{3,80}?)(?:\.|,|\?|$)/i
  );
  if (m?.[1]) {
    return m[1].trim().replace(/^(the|a|an)\s+/i, '');
  }
  return 'Unspecified topic';
}
