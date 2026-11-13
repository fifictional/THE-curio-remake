/**
 * Chat Summary Embed Job (EOPRD-813)
 *
 * Creator: Queues each space that has chats (for summarisation of older messages)
 * Mutator: Summarises chat messages older than 24h, embeds into OpenSearch for RAG
 */

export const JOB_NAME = "chat-summary-embed";

export type ChatSummaryEmbedJob = {
  spaceUuid: string;
  userUuid: string;
};
