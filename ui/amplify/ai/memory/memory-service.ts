import type { Schema } from '@database-schema';
import { generateClient } from 'aws-amplify/data';
import { v4 as uuidv4 } from 'uuid';
import type {
  MemoryBlockRecord,
  MemoryCandidateInput,
  MemoryAddedFrom,
  MemoryRetrievalContext,
  MemoryScope,
} from './types';
import {
  BLOCK_TYPE_KNOWLEDGE_GAP,
  BLOCK_TYPE_MASTERED_TOPIC,
  ADDED_FROM_CHAT,
  MIN_CONFIDENCE_TO_STORE,
  TOPIC_MERGE_SIMILARITY,
} from './constants';
import { formatTopicDisplayName, topicSimilarity } from './topic-similarity';
import {
  memoryTimestampsForCreate,
  memoryTimestampsForMerge,
} from './resolve-event-time';

// Vector store is dynamic-imported so ai-chat does not require OpenSearch at module load.
async function loadVectorStore() {
  return import('./vector-store');
}

// Remove keys whose value is `undefined` so JSON serialization is stable
// for the AWSJSON scalar (AppSync rejects raw objects that contain undefined).
function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}

type DataClient = ReturnType<typeof generateClient<Schema>>;

function resolveAddedFrom(input: MemoryCandidateInput): MemoryAddedFrom {
  return input.addedFrom ?? ADDED_FROM_CHAT;
}

export class MemoryService {
  constructor(private readonly client: DataClient) {}

  async isMemoryEnabledForUser(ownerUuid: string): Promise<boolean> {
    try {
      const appSettingsAt = Date.now();
      const settings = await this.client.models.AppSettings.list({
        selectionSet: ['memoryFeatureEnabled', 'featureFlags.*'],
      });
      console.info('[MemoryService] AppSettings.list', {
        ownerUuid,
        durationMs: Date.now() - appSettingsAt,
        rowCount: settings.data?.length ?? 0,
        errors: settings.errors,
      });
      const row = settings.data?.[0];
      // Global kill switch (admin App Settings checkbox)
      if (row?.memoryFeatureEnabled === false) {
        console.info('[MemoryService] memory disabled by global kill switch', { ownerUuid });
        return false;
      }
      const flags = row?.featureFlags ?? [];
      const flag = flags.find((f) => f?.flagName === 'memory_tracking');
      if (flag?.flagValue === 'inactive') {
        console.info('[MemoryService] memory disabled by feature flag', { ownerUuid });
        return false;
      }

      const profileAt = Date.now();
      const profile = await this.client.models.UserProfile.get({
        userUuid: ownerUuid,
      });
      console.info('[MemoryService] UserProfile.get', {
        ownerUuid,
        durationMs: Date.now() - profileAt,
        memoryDisabled: profile.data?.memoryDisabled ?? null,
        errors: profile.errors,
      });
      // Per-user toggle on /settings
      if (profile.data?.memoryDisabled === true) return false;
      return true;
    } catch (err) {
      console.warn('[MemoryService] isMemoryEnabledForUser threw, treating as disabled', {
        ownerUuid,
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  async listBlocksForOwner(
    ownerUuid: string,
    blockType?: string,
    limit = 50
  ): Promise<MemoryBlockRecord[]> {
    const result = await this.client.models.MemoryBlock.listMemoryBlockByOwnerUuidAndUpdatedAt(
      { ownerUuid },
      {
        sortDirection: 'DESC',
        limit,
        ...(blockType
          ? { filter: { blockType: { eq: blockType } } }
          : {}),
      }
    );
    return (result.data ?? []) as MemoryBlockRecord[];
  }

  async search(
    ctx: MemoryRetrievalContext,
    options?: { skipVector?: boolean }
  ): Promise<MemoryBlockRecord[]> {
    const { ownerUuid, query, spaceUuid, documentUuids = [], k = 8 } = ctx;
    const scopes: Array<{ scope: MemoryScope; scopeId: string }> = [
      { scope: 'user', scopeId: ownerUuid },
    ];
    if (spaceUuid) scopes.push({ scope: 'folder', scopeId: spaceUuid });
    for (const docId of documentUuids) {
      scopes.push({ scope: 'file', scopeId: docId });
    }

    if (!options?.skipVector) {
    try {
      const { searchMemoryBlocksVector } = await loadVectorStore();
      const vectorHits = await searchMemoryBlocksVector({
        ownerUuid,
        query,
        scopes,
        k,
      });
      if (vectorHits.length > 0) {
        const blocks: MemoryBlockRecord[] = [];
        for (const hit of vectorHits) {
          if (!hit.block.memoryBlockUuid) continue;
          const row = await this.client.models.MemoryBlock.get({
            memoryBlockUuid: hit.block.memoryBlockUuid,
          });
          if (row.data) blocks.push(row.data as MemoryBlockRecord);
        }
        if (blocks.length > 0) return blocks;
      }
    } catch (err) {
      console.warn('[memory] vector search fallback', err);
    }
    }

    const listAt = Date.now();
    const all = await this.listBlocksForOwner(ownerUuid, undefined, 100);
    console.info('[MemoryService] listBlocksForOwner', {
      ownerUuid,
      totalBlocks: all.length,
      durationMs: Date.now() - listAt,
    });
    const inScope = all.filter((b) =>
      scopes.some((s) => s.scope === b.scope && s.scopeId === b.scopeId)
    );
    const q = query.toLowerCase();
    const scored = inScope
      .map((b) => {
        const topicScore = topicSimilarity(b.topic, query);
        const textMatch = b.topic.toLowerCase().includes(q) ? 0.2 : 0;
        return {
          block: b,
          score: b.confidence * (topicScore + textMatch),
        };
      })
      .filter((x) => x.score > 0.1)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);

    if (scored.length > 0) {
      console.info('[memory] search matched by query', {
        ownerUuid,
        matchedCount: scored.length,
        topTopics: scored.slice(0, 3).map((s) => s.block.topic),
      });
      return scored.map((s) => s.block);
    }

    // Graceful fallback: when nothing matches the current query (e.g. greetings,
    // session-opening messages, or topics phrased very differently), surface the
    // user's most recent / most confident memory blocks as background context so
    // the assistant has continuity across sessions. `listBlocksForOwner` already
    // sorts by updatedAt DESC, so the top of `inScope` is the freshest material.
    const fallback = inScope
      .slice() // don't mutate
      .sort((a, b) => {
        const aTime = Date.parse(a.updatedAt ?? a.lastReinforcedAt ?? a.createdAt) || 0;
        const bTime = Date.parse(b.updatedAt ?? b.lastReinforcedAt ?? b.createdAt) || 0;
        const aScore = (a.confidence ?? 0) * 0.7 + (aTime / 1e13) * 0.3;
        const bScore = (b.confidence ?? 0) * 0.7 + (bTime / 1e13) * 0.3;
        return bScore - aScore;
      })
      .slice(0, k);

    console.info('[memory] search fallback to recent blocks', {
      ownerUuid,
      totalInScope: inScope.length,
      returnedCount: fallback.length,
      topTopics: fallback.slice(0, 3).map((b) => b.topic),
    });

    return fallback;
  }

  async findSimilarBlock(
    ownerUuid: string,
    scope: MemoryScope,
    scopeId: string,
    blockType: string,
    topic: string
  ): Promise<MemoryBlockRecord | null> {
    try {
      const { findSimilarMemoryBlockVector } = await loadVectorStore();
      const vectorUuid = await findSimilarMemoryBlockVector({
        ownerUuid,
        blockType,
        topic,
      });
      if (vectorUuid) {
        const row = await this.client.models.MemoryBlock.get({
          memoryBlockUuid: vectorUuid,
        });
        if (row.data) return row.data as MemoryBlockRecord;
      }
    } catch (err) {
      console.warn('[memory] vector similarity fallback', err);
    }

    const blocks = await this.listBlocksForOwner(ownerUuid, blockType, 100);
    let best: MemoryBlockRecord | null = null;
    let bestSim = 0;
    for (const b of blocks) {
      const sim = topicSimilarity(b.topic, topic);
      if (sim >= TOPIC_MERGE_SIMILARITY && sim > bestSim) {
        best = b;
        bestSim = sim;
      }
    }
    return best;
  }

  private async deleteSimilarBlocks(
    ownerUuid: string,
    blockType: string,
    topic: string,
    excludeUuid?: string
  ): Promise<number> {
    const blocks = await this.listBlocksForOwner(ownerUuid, blockType, 100);
    let deleted = 0;

    for (const block of blocks) {
      if (excludeUuid && block.memoryBlockUuid === excludeUuid) continue;
      if (topicSimilarity(block.topic, topic) < TOPIC_MERGE_SIMILARITY) continue;

      await this.client.models.MemoryBlock.delete({
        memoryBlockUuid: block.memoryBlockUuid,
      });
      void loadVectorStore()
        .then(({ deleteMemoryBlockFromIndex }) =>
          deleteMemoryBlockFromIndex(block.memoryBlockUuid)
        )
        .catch(() => {});
      deleted += 1;
    }

    return deleted;
  }

  /**
   * A strong score (>= QUIZ_MASTERED_SCORE_RATIO) proves there is no gap on
   * the topic, even when it isn't yet enough evidence to record mastery
   * (which needs several strong days). Deletes any conflicting gap blocks.
   */
  async resolveGapsForHighScore(ownerUuid: string, topic: string): Promise<number> {
    return this.deleteSimilarBlocks(ownerUuid, BLOCK_TYPE_KNOWLEDGE_GAP, topic);
  }

  async consolidateBlocksForOwner(ownerUuid: string): Promise<{
    removedDuplicates: number;
    resolvedCrossCategory: number;
  }> {
    let removedDuplicates = 0;
    let resolvedCrossCategory = 0;

    const all = await this.listBlocksForOwner(ownerUuid, undefined, 500);
    const mastered = all.filter((block) => block.blockType === BLOCK_TYPE_MASTERED_TOPIC);
    const gaps = all.filter((block) => block.blockType === BLOCK_TYPE_KNOWLEDGE_GAP);

    for (const gap of gaps) {
      const conflictingMastered = mastered.find((block) =>
        topicSimilarity(block.topic, gap.topic) >= TOPIC_MERGE_SIMILARITY
      );
      if (!conflictingMastered) continue;

      await this.client.models.MemoryBlock.delete({
        memoryBlockUuid: gap.memoryBlockUuid,
      });
      void loadVectorStore()
        .then(({ deleteMemoryBlockFromIndex }) =>
          deleteMemoryBlockFromIndex(gap.memoryBlockUuid)
        )
        .catch(() => {});
      resolvedCrossCategory += 1;
    }

    const remaining = (await this.listBlocksForOwner(ownerUuid, undefined, 500)).filter(
      (block) => block.blockType === BLOCK_TYPE_KNOWLEDGE_GAP ||
        block.blockType === BLOCK_TYPE_MASTERED_TOPIC
    );

    const keptByType = new Map<string, MemoryBlockRecord[]>();
    for (const blockType of [BLOCK_TYPE_KNOWLEDGE_GAP, BLOCK_TYPE_MASTERED_TOPIC]) {
      keptByType.set(blockType, []);
    }

    for (const block of remaining) {
      const kept = keptByType.get(block.blockType) ?? [];
      const duplicate = kept.find(
        (existing) =>
          topicSimilarity(existing.topic, block.topic) >= TOPIC_MERGE_SIMILARITY
      );

      if (!duplicate) {
        kept.push(block);
        keptByType.set(block.blockType, kept);
        continue;
      }

      const preferred =
        (block.confidence ?? 0) > (duplicate.confidence ?? 0) ? block : duplicate;
      const toDelete =
        preferred.memoryBlockUuid === block.memoryBlockUuid ? duplicate : block;

      await this.client.models.MemoryBlock.delete({
        memoryBlockUuid: toDelete.memoryBlockUuid,
      });
      void loadVectorStore()
        .then(({ deleteMemoryBlockFromIndex }) =>
          deleteMemoryBlockFromIndex(toDelete.memoryBlockUuid)
        )
        .catch(() => {});

      keptByType.set(
        block.blockType,
        kept.map((existing) =>
          existing.memoryBlockUuid === toDelete.memoryBlockUuid ? preferred : existing
        )
      );
      removedDuplicates += 1;
    }

    const normalized = await this.listBlocksForOwner(ownerUuid, undefined, 500);
    for (const block of normalized) {
      if (
        block.blockType !== BLOCK_TYPE_KNOWLEDGE_GAP &&
        block.blockType !== BLOCK_TYPE_MASTERED_TOPIC
      ) {
        continue;
      }

      const formattedTopic = formatTopicDisplayName(block.topic);
      if (!formattedTopic || formattedTopic === block.topic) {
        continue;
      }

      await this.client.models.MemoryBlock.update({
        memoryBlockUuid: block.memoryBlockUuid,
        blockType: block.blockType,
        topic: formattedTopic,
        updatedAt: new Date().toISOString(),
      });
    }

    return { removedDuplicates, resolvedCrossCategory };
  }

  async upsertCandidate(input: MemoryCandidateInput): Promise<{
    decision: 'created' | 'merged' | 'rejected';
    memoryBlockUuid?: string;
  }> {
    if (input.confidence < MIN_CONFIDENCE_TO_STORE) {
      await this.logCandidate(input, 'rejected');
      return { decision: 'rejected' };
    }

    if (input.blockType === BLOCK_TYPE_KNOWLEDGE_GAP) {
      const mastered = await this.findSimilarBlock(
        input.ownerUuid,
        input.scope,
        input.scopeId,
        BLOCK_TYPE_MASTERED_TOPIC,
        input.topic
      );
      if (mastered) {
        await this.logCandidate(input, 'rejected', mastered.memoryBlockUuid);
        return { decision: 'rejected' };
      }
    }

    const existing = await this.findSimilarBlock(
      input.ownerUuid,
      input.scope,
      input.scopeId,
      input.blockType,
      input.topic
    );

    const now = new Date().toISOString();
    const createTimes = memoryTimestampsForCreate(input.occurredAt, now);
    const addedFrom = resolveAddedFrom(input);
    const isBackfill = input.isBackfill ?? false;

    if (existing) {
      const merged = await this.mergeBlock(existing, input, now);
      await this.logCandidate(input, 'merged', existing.memoryBlockUuid);
      return { decision: 'merged', memoryBlockUuid: merged.memoryBlockUuid };
    }

    if (input.blockType === BLOCK_TYPE_MASTERED_TOPIC) {
      await this.deleteSimilarBlocks(
        input.ownerUuid,
        BLOCK_TYPE_KNOWLEDGE_GAP,
        input.topic
      );
    }

    const memoryBlockUuid = uuidv4();
    const cleanPayload = stripUndefined(input.payload as Record<string, unknown>);
    const created: MemoryBlockRecord = {
      memoryBlockUuid,
      ownerUuid: input.ownerUuid,
      scope: input.scope,
      scopeId: input.scopeId,
      blockType: input.blockType,
      payload: cleanPayload as MemoryBlockRecord['payload'],
      topic: formatTopicDisplayName(input.topic),
      subject: input.subject,
      documentUuid: input.documentUuid,
      confidence: input.confidence,
      frequency: 1,
      attemptScores: [],
      attemptDates: [],
      firstSeenAt: createTimes.firstSeenAt,
      lastReinforcedAt: createTimes.lastReinforcedAt,
      version: 1,
      sources: input.sources ?? [],
      addedFrom,
      isBackfill,
      createdAt: createTimes.createdAt,
      updatedAt: createTimes.updatedAt,
    };
    // `payload` is declared as a.json() in the data schema (AWSJSON scalar).
    // Other models in this project (e.g. conceptPerformance) write to a.json()
    // fields by passing a pre-stringified JSON string, so we do the same here.
    const createRes = await this.client.models.MemoryBlock.create({
      ...created,
      payload: JSON.stringify(cleanPayload) as unknown as MemoryBlockRecord['payload'],
    });
    if (createRes.errors?.length || !createRes.data) {
      console.error('[MemoryService] MemoryBlock.create failed', {
        ownerUuid: input.ownerUuid,
        topic: input.topic,
        blockType: input.blockType,
        errors: createRes.errors,
        hasData: !!createRes.data,
      });
      await this.logCandidate(input, 'rejected');
      return { decision: 'rejected' };
    }
    console.info('[MemoryService] MemoryBlock.create ok', {
      memoryBlockUuid,
      ownerUuid: input.ownerUuid,
      topic: input.topic,
      blockType: input.blockType,
      addedFrom,
      isBackfill,
    });
    void loadVectorStore()
      .then(({ indexMemoryBlock }) => indexMemoryBlock(created))
      .catch((e) => console.warn('[memory] index create failed', e));
    await this.logCandidate(input, 'created', memoryBlockUuid);
    return { decision: 'created', memoryBlockUuid };
  }

  private async mergeBlock(
    existing: MemoryBlockRecord,
    input: MemoryCandidateInput,
    now: string
  ): Promise<MemoryBlockRecord> {
    const newFreq = (existing.frequency ?? 1) + 1;
    const newConf = Math.min(
      1,
      (existing.confidence + input.confidence) / 2 + 0.05
    );
    const sources = [
      ...new Set([...(existing.sources ?? []), ...(input.sources ?? [])]),
    ];
    const payload = {
      ...(existing.payload as Record<string, unknown>),
      ...(input.payload as Record<string, unknown>),
      askedCount: newFreq,
    } as MemoryBlockRecord['payload'];
    const cleanPayload = stripUndefined(payload as Record<string, unknown>);
    const mergeTimes = memoryTimestampsForMerge(existing, input.occurredAt, now);
    // `blockType` must be included alongside `updatedAt` because the GSI
    // `memoryBlocksByOwnerUuidAndBlockTypeAndUpdatedAt` has a composite sort
    // key of (blockType, updatedAt). Updating any part of that key requires
    // the full key, otherwise AppSync rejects the mutation.
    const mergedTopic = formatTopicDisplayName(
      input.topic.length > existing.topic.length ? input.topic : existing.topic,
    );
    const updateRes = await this.client.models.MemoryBlock.update({
      memoryBlockUuid: existing.memoryBlockUuid,
      blockType: existing.blockType,
      topic: mergedTopic,
      payload: JSON.stringify(cleanPayload) as unknown as MemoryBlockRecord['payload'],
      confidence: newConf,
      frequency: newFreq,
      firstSeenAt: mergeTimes.firstSeenAt,
      lastReinforcedAt: mergeTimes.lastReinforcedAt,
      updatedAt: mergeTimes.updatedAt,
      version: (existing.version ?? 1) + 1,
      sources,
    });
    if (updateRes.errors?.length || !updateRes.data) {
      console.error('[MemoryService] MemoryBlock.update failed', {
        memoryBlockUuid: existing.memoryBlockUuid,
        errors: updateRes.errors,
        hasData: !!updateRes.data,
      });
    }
    const merged: MemoryBlockRecord = {
      ...existing,
      topic: mergedTopic,
      payload,
      confidence: newConf,
      frequency: newFreq,
      firstSeenAt: mergeTimes.firstSeenAt,
      lastReinforcedAt: mergeTimes.lastReinforcedAt,
      updatedAt: mergeTimes.updatedAt,
      version: (existing.version ?? 1) + 1,
      sources,
    };
    void loadVectorStore()
      .then(({ indexMemoryBlock }) => indexMemoryBlock(merged))
      .catch((e) => console.warn('[memory] index merge failed', e));
    return merged;
  }

  private async logCandidate(
    input: MemoryCandidateInput,
    decision: 'created' | 'merged' | 'rejected',
    mergedIntoUuid?: string
  ): Promise<void> {
    const candidateUuid = uuidv4();
    const cleanProposed = stripUndefined(input.payload as Record<string, unknown>);
    const res = await this.client.models.MemoryCandidate.create({
      memoryCandidateUuid: candidateUuid,
      ownerUuid: input.ownerUuid,
      scope: input.scope,
      scopeId: input.scopeId,
      proposedBlock: JSON.stringify(cleanProposed) as unknown as object,
      decision,
      mergedIntoUuid,
      messageUuid: input.messageUuid,
      chatUuid: input.chatUuid,
      createdAt: new Date().toISOString(),
    });
    if (res.errors?.length || !res.data) {
      console.error('[MemoryService] MemoryCandidate.create failed', {
        candidateUuid,
        ownerUuid: input.ownerUuid,
        topic: input.topic,
        decision,
        errors: res.errors,
        hasData: !!res.data,
      });
    }
  }

  async deleteBlock(memoryBlockUuid: string, ownerUuid: string): Promise<void> {
    const row = await this.client.models.MemoryBlock.get({ memoryBlockUuid });
    if (row.data?.ownerUuid !== ownerUuid) {
      throw new Error('Not authorized to delete this memory block');
    }
    await this.client.models.MemoryBlock.delete({ memoryBlockUuid });
    void loadVectorStore()
      .then(({ deleteMemoryBlockFromIndex }) =>
        deleteMemoryBlockFromIndex(memoryBlockUuid)
      )
      .catch(() => {});
  }

  async clearAllForOwner(ownerUuid: string): Promise<number> {
    const blocks = await this.listBlocksForOwner(ownerUuid, undefined, 500);
    await Promise.all(
      blocks.map((b) =>
        this.client.models.MemoryBlock.delete({
          memoryBlockUuid: b.memoryBlockUuid,
        })
      )
    );
    void loadVectorStore()
      .then(({ deleteAllMemoryBlocksForUser }) =>
        deleteAllMemoryBlocksForUser(ownerUuid)
      )
      .catch((e) => console.warn('[memory] vector clear failed', e));
    return blocks.length;
  }
}
