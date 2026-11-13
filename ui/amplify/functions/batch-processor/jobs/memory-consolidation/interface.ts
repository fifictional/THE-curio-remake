/**
 * Memory consolidation batch job.
 *
 * Creator: scans MemoryBlock rows and emits one job per unique ownerUuid.
 * Mutator: quiz backfill (if needed) + consolidateBlocksForOwner per user.
 */

export const JOB_NAME = 'memory-consolidation';

export type MemoryConsolidationJob = {
  userUuid: string;
};
