import type { Schema } from '../../../../data/resource';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env as mutatorEnv } from '$amplify/env/batch-mutator';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import { registerMutator } from '../../../../common/batch-processing';
import { runChatHistoryBackfill } from '@ai-memory/index';
import { JOB_NAME, ChatMemoryBackfillJob } from './interface';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  mutatorEnv as any
);

Amplify.configure(resourceConfig, libraryOptions);
const mutatorClient = generateClient<Schema>();
const cloudwatchClient = new CloudWatchClient({});

registerMutator({
  jobType: JOB_NAME,
  processJob: async (job: ChatMemoryBackfillJob, log) => {
    const { userUuid, chatUuid } = job;
    log(`Processing chat memory backfill for chat ${chatUuid} (user ${userUuid})`);

    const result = await runChatHistoryBackfill(
      mutatorClient,
      cloudwatchClient,
      userUuid,
      chatUuid
    );

    if (result.skipped) {
      log(`Skipped chat ${chatUuid} (already done or memory disabled / missing chat)`);
      return;
    }

    log(
      `Completed chat ${chatUuid}: interactions=${result.interactionsProcessed}, stored=${result.stored}`
    );
  },
});
