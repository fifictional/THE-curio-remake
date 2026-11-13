import type { Schema } from '@database-schema';
import type { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import { generateClient } from 'aws-amplify/data';
import { v4 as uuidv4 } from 'uuid';
import { MemoryService } from './memory-service';
import { ADDED_FROM_CHAT } from './constants';
import { runAgentReflection } from './run-agent-reflection';
import type { MemoryQueueEvent } from './types';

type DataClient = ReturnType<typeof generateClient<Schema>>;

export const CHAT_BACKFILL_COMPLETE_META = 'memory_chat_backfill_complete_v2';

export interface ChatMessageRow {
  messageUuid: string;
  role?: string | null;
  content?: string | null;
  type?: string | null;
  createdAt: string;
}

export interface ChatInteractionTurn {
  messageUuid: string;
  userTurn: string;
  assistantTurn: string;
  occurredAt: string;
}

export interface ChatBackfillResult {
  interactionsProcessed: number;
  stored: number;
  skipped: boolean;
}

/** Pair each user text message with the next assistant reply (mirrors live chat flow). */
export function pairChatInteractionTurns(
  messages: ChatMessageRow[]
): ChatInteractionTurn[] {
  const sorted = [...messages].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  );
  const pairs: ChatInteractionTurn[] = [];
  let pendingUser: { messageUuid: string; content: string; createdAt: string } | null = null;

  for (const msg of sorted) {
    if (!msg.content?.trim() || msg.type === 'tool') continue;

    if (msg.role === 'user') {
      pendingUser = {
        messageUuid: msg.messageUuid,
        content: msg.content.trim(),
        createdAt: msg.createdAt,
      };
      continue;
    }

    if (msg.role === 'assistant' && pendingUser) {
      pairs.push({
        messageUuid: pendingUser.messageUuid,
        userTurn: pendingUser.content,
        assistantTurn: msg.content.trim(),
        occurredAt: pendingUser.createdAt,
      });
      pendingUser = null;
    }
  }

  return pairs;
}

export async function isChatBackfillComplete(
  client: DataClient,
  chatUuid: string
): Promise<boolean> {
  const existing = await client.models.Metadata.list({
    filter: {
      targetUuid: { eq: chatUuid },
      targetType: { eq: 'chat' },
      name: { eq: CHAT_BACKFILL_COMPLETE_META },
    },
    limit: 1,
  });
  return existing.data?.[0]?.value === 'true';
}

async function markChatBackfillComplete(
  client: DataClient,
  chatUuid: string
): Promise<void> {
  const now = new Date().toISOString();
  await client.models.Metadata.create({
    metadataUuid: uuidv4(),
    targetUuid: chatUuid,
    targetType: 'chat',
    name: CHAT_BACKFILL_COMPLETE_META,
    value: 'true',
    createdAt: now,
    updatedAt: now,
  });
}

export async function runChatHistoryBackfill(
  client: DataClient,
  cloudwatchClient: CloudWatchClient,
  ownerUuid: string,
  chatUuid: string
): Promise<ChatBackfillResult> {
  if (await isChatBackfillComplete(client, chatUuid)) {
    return { interactionsProcessed: 0, stored: 0, skipped: true };
  }

  const memory = new MemoryService(client);
  if (!(await memory.isMemoryEnabledForUser(ownerUuid))) {
    return { interactionsProcessed: 0, stored: 0, skipped: true };
  }

  const chatRow = await client.models.Chat.get({ chatUuid });
  if (!chatRow.data?.chatUuid) {
    await markChatBackfillComplete(client, chatUuid);
    return { interactionsProcessed: 0, stored: 0, skipped: true };
  }

  const spaceUuid = chatRow.data.spaceUuid ?? null;
  const documentUuid = chatRow.data.documentUuid ?? null;
  const documentUuids = documentUuid ? [documentUuid] : undefined;

  const allMessages: ChatMessageRow[] = [];
  let msgToken: string | undefined;
  do {
    const msgRes = await client.models.Message.listMessageByChatUuidAndCreatedAt(
      { chatUuid },
      { limit: 100, nextToken: msgToken, sortDirection: 'ASC' }
    );
    for (const msg of msgRes.data ?? []) {
      if (!msg.messageUuid || !msg.createdAt) continue;
      allMessages.push({
        messageUuid: msg.messageUuid,
        role: msg.role,
        content: msg.content,
        type: msg.type,
        createdAt: msg.createdAt,
      });
    }
    msgToken = msgRes.nextToken ?? undefined;
  } while (msgToken);

  const pairs = pairChatInteractionTurns(allMessages);
  let stored = 0;
  let agentFailures = 0;

  for (const pair of pairs) {
    const event: MemoryQueueEvent = {
      type: 'chat_interaction',
      ownerUuid,
      chatUuid,
      messageUuid: pair.messageUuid,
      userTurn: pair.userTurn,
      assistantTurn: pair.assistantTurn,
      spaceUuid,
      documentUuids,
      occurredAt: pair.occurredAt,
      addedFrom: ADDED_FROM_CHAT,
      isBackfill: true,
    };

    const result = await runAgentReflection({
      client,
      event,
      cloudwatchClient,
    });
    if (result.agentFailed) {
      agentFailures += 1;
      continue;
    }
    stored += result.stored;
  }

  if (agentFailures > 0) {
    throw new Error(
      `Memory reflection failed for ${agentFailures}/${pairs.length} interactions in chat ${chatUuid}`
    );
  }

  if (pairs.length > 0) {
    await memory.consolidateBlocksForOwner(ownerUuid);
  }

  await markChatBackfillComplete(client, chatUuid);

  return {
    interactionsProcessed: pairs.length,
    stored,
    skipped: false,
  };
}
