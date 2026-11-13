import type { Schema } from "../../../../data/resource";
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env as mutatorEnv } from '$amplify/env/batch-mutator';
import { Amplify } from 'aws-amplify';
import { generateClient } from "aws-amplify/api";
import { registerMutator } from "../../../../common/batch-processing";
import { JOB_NAME, SubscriptionTierDefaultJob } from "./interface";

// Initialize Amplify Data client for mutator
const { resourceConfig: mutatorResourceConfig, libraryOptions: mutatorLibraryOptions } = await getAmplifyDataClientConfig(
  mutatorEnv as any
);

Amplify.configure(mutatorResourceConfig, mutatorLibraryOptions);
const mutatorClient = generateClient<Schema>();

// Register mutator
registerMutator({
  jobType: JOB_NAME,
  processJob: async (job: SubscriptionTierDefaultJob, log, jobId: string) => {
    const { subscriptionId } = job;
    
    log(`Updating subscription ${subscriptionId} with tier = 'super'`);

    try {
      const response = await mutatorClient.models.CurioSubscription.update({
        subscriptionId,
        tier: 'super' as const,
        updatedAt: new Date().toISOString(),
      } as any);

      if (response.errors) {
        throw new Error(`Failed to update subscription: ${response.errors[0].message}`);
      }

      log(`Successfully updated subscription ${subscriptionId} with tier = 'super'`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`Error updating subscription ${subscriptionId}: ${errorMessage}`);
      throw error;
    }
  },
});

