import type { Schema } from '../../../../data/resource';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env as creatorEnv } from '$amplify/env/hono-heavy';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import { registerCreator } from '../../../../common/batch-processing';
import { CONSOLIDATION_V2_COMPLETE_META } from '@ai-memory/index';
import { JOB_NAME, MemoryConsolidationJob } from './interface';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  creatorEnv as any
);

Amplify.configure(resourceConfig, libraryOptions);
const creatorClient = generateClient<Schema>();

async function isConsolidationComplete(userUuid: string): Promise<boolean> {
  const response = await creatorClient.models.Metadata.list({
    filter: {
      targetUuid: { eq: userUuid },
      targetType: { eq: 'user' },
      name: { eq: CONSOLIDATION_V2_COMPLETE_META },
    },
    limit: 1,
  });
  return response.data?.[0]?.value === 'true';
}

registerCreator({
  name: 'Memory Consolidation',
  jobType: JOB_NAME,
  description:
    'Backfill memory from quiz/mock-exam history, dedupe topics, resolve cross-category conflicts, and normalize topic names for all users',
  createJobs: async (emit, log) => {
    const ownerUuids = new Set<string>();

    // All users, not just those who already have memory blocks — the mutator
    // also backfills quiz/mock-exam history, which matters precisely for users
    // with zero blocks today. Memory-disabled users are skipped in the mutator.
    log('Scanning UserProfile table for users...');
    let profileToken: string | undefined;
    do {
      const response = await creatorClient.models.UserProfile.list({
        limit: 1000,
        nextToken: profileToken,
        selectionSet: ['userUuid'],
      });
      for (const profile of response.data ?? []) {
        if (profile.userUuid) {
          ownerUuids.add(profile.userUuid);
        }
      }
      profileToken = response.nextToken ?? undefined;
    } while (profileToken);

    log(`Found ${ownerUuids.size} users from UserProfile`);

    // Also include owners of existing blocks, in case any predate UserProfile.
    log('Scanning MemoryBlock table for unique owners...');
    let blocksScanned = 0;
    let nextToken: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const response = await creatorClient.models.MemoryBlock.list({
        limit: 1000,
        nextToken,
        selectionSet: ['ownerUuid'],
      });

      for (const block of response.data ?? []) {
        if (block.ownerUuid) {
          ownerUuids.add(block.ownerUuid);
        }
      }

      blocksScanned += response.data?.length ?? 0;
      nextToken = response.nextToken ?? undefined;
      hasMore = !!nextToken;

      if (blocksScanned % 5000 === 0 && blocksScanned > 0) {
        log(`Scanned ${blocksScanned} blocks, ${ownerUuids.size} unique owners so far...`);
      }
    }

    log(`Found ${ownerUuids.size} unique users total (${blocksScanned} memory blocks scanned)`);

    let profilesQueued = 0;
    let profilesSkipped = 0;

    for (const userUuid of ownerUuids) {
      if (await isConsolidationComplete(userUuid)) {
        profilesSkipped += 1;
        continue;
      }

      await emit({ userUuid } satisfies MemoryConsolidationJob);
      profilesQueued += 1;
    }

    log(
      `Queued ${profilesQueued} users for consolidation (${profilesSkipped} already migrated)`
    );
  },
});
