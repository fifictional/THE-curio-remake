/**
 * Chat memory backfill batch job.
 *
 * Creator: emits one job per chat that has not yet been backfilled.
 * Mutator: replays user/assistant turns through the memory reflection agent.
 */

export const JOB_NAME = 'chat-memory-backfill';

export type ChatMemoryBackfillJob = {
  userUuid: string;
  chatUuid: string;
};
