import type { Schema } from '@database-schema';
import { generateClient } from 'aws-amplify/data';
import { MemoryService } from './memory-service';
import { formatMemoryBlocksForPrompt } from './format-for-prompt';

type DataClient = ReturnType<typeof generateClient<Schema>>;

const MEMORY_FETCH_TIMEOUT_MS = 5000;

export async function fetchMemoryForChat(
  client: DataClient,
  params: {
    ownerUuid: string;
    query: string;
    spaceUuid?: string | null;
    documentUuids?: string[];
  }
): Promise<{ memoryContext: string; masteryContext: string }> {
  const empty = { memoryContext: '', masteryContext: '' };

  const startedAt = Date.now();

  const fetchInner = async () => {
    const memory = new MemoryService(client);
    const enabledAt = Date.now();
    const enabled = await memory.isMemoryEnabledForUser(params.ownerUuid);
    console.info('[memory] isMemoryEnabledForUser', {
      ownerUuid: params.ownerUuid,
      enabled,
      durationMs: Date.now() - enabledAt,
    });
    if (!enabled) {
      return empty;
    }
    // Chat path: DynamoDB topic match only — avoid OpenSearch/Bedrock embed latency or hangs on request path
    const searchedAt = Date.now();
    const blocks = await memory.search(
      {
        ownerUuid: params.ownerUuid,
        query: params.query,
        spaceUuid: params.spaceUuid,
        documentUuids: params.documentUuids,
        k: 8,
      },
      { skipVector: true }
    );
    console.info('[memory] search done', {
      ownerUuid: params.ownerUuid,
      blockCount: blocks.length,
      durationMs: Date.now() - searchedAt,
    });
    return formatMemoryBlocksForPrompt(blocks);
  };

  // Use a cancellable timer so the inner promise winning the race doesn't leave
  // a dangling setTimeout in the event loop (which fires the false-positive
  // "timed out" warning during the next Lambda invocation).
  let timer: NodeJS.Timeout | undefined;
  try {
    const timeoutPromise = new Promise<typeof empty>((resolve) => {
      timer = setTimeout(() => {
        console.warn('[memory] fetchMemoryForChat timed out; skipping memory context', {
          ownerUuid: params.ownerUuid,
          waitedMs: Date.now() - startedAt,
        });
        resolve(empty);
      }, MEMORY_FETCH_TIMEOUT_MS);
    });
    const result = await Promise.race([fetchInner(), timeoutPromise]);
    return result;
  } catch (err) {
    console.warn('[memory] fetchMemoryForChat failed; skipping', err);
    return empty;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
