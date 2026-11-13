import type { Schema } from '../../../../data/resource';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env as mutatorEnv } from '$amplify/env/batch-mutator';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import { registerMutator } from '../../../../common/batch-processing';
import {
  CONSOLIDATION_V2_COMPLETE_META,
  MemoryService,
  runQuizHistoryBackfill,
} from '@ai-memory/index';
import { v4 as uuidv4 } from 'uuid';
import { JOB_NAME, MemoryConsolidationJob } from './interface';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  mutatorEnv as any
);

Amplify.configure(resourceConfig, libraryOptions);
const mutatorClient = generateClient<Schema>();

async function isConsolidationComplete(userUuid: string): Promise<boolean> {
  const response = await mutatorClient.models.Metadata.list({
    filter: {
      targetUuid: { eq: userUuid },
      targetType: { eq: 'user' },
      name: { eq: CONSOLIDATION_V2_COMPLETE_META },
    },
    limit: 1,
  });
  return response.data?.[0]?.value === 'true';
}

async function markConsolidationComplete(userUuid: string): Promise<void> {
  const now = new Date().toISOString();
  await mutatorClient.models.Metadata.create({
    metadataUuid: uuidv4(),
    targetUuid: userUuid,
    targetType: 'user',
    name: CONSOLIDATION_V2_COMPLETE_META,
    value: 'true',
    createdAt: now,
    updatedAt: now,
  });
}

registerMutator({
  jobType: JOB_NAME,
  processJob: async (job: MemoryConsolidationJob, log) => {
    const { userUuid } = job;
    log(`Processing memory consolidation for user ${userUuid}`);

    const memory = new MemoryService(mutatorClient);

    if (!(await memory.isMemoryEnabledForUser(userUuid))) {
      log(`Memory disabled for user ${userUuid}, skipping`);
      return;
    }

    if (await isConsolidationComplete(userUuid)) {
      log(`User ${userUuid} already consolidated, skipping`);
      return;
    }

    const backfill = await runQuizHistoryBackfill(mutatorClient, memory, userUuid);
    const consolidated = await memory.consolidateBlocksForOwner(userUuid);

    await markConsolidationComplete(userUuid);

    log(
      `Completed user ${userUuid}: backfillSkipped=${backfill.skipped}, gaps=${backfill.gapsCreated}, mastered=${backfill.masteredCreated}, removedDuplicates=${consolidated.removedDuplicates}, resolvedCrossCategory=${consolidated.resolvedCrossCategory}`
    );
  },
});
