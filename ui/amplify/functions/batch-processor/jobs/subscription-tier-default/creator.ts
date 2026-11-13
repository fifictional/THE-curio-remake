import type { Schema } from "../../../../data/resource";
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env as creatorEnv } from '$amplify/env/hono-heavy';
import { Amplify } from 'aws-amplify';
import { generateClient } from "aws-amplify/api";
import { registerCreator } from "../../../../common/batch-processing";
import { JOB_NAME, SubscriptionTierDefaultJob } from "./interface";

// Initialize Amplify Data client for creator
const { resourceConfig: creatorResourceConfig, libraryOptions: creatorLibraryOptions } = await getAmplifyDataClientConfig(
  creatorEnv as any
);

Amplify.configure(creatorResourceConfig, creatorLibraryOptions);
const creatorClient = generateClient<Schema>();

// Register creator
registerCreator({
  name: "Subscription Tier Default",
  jobType: JOB_NAME,
  description: "Set tier = 'super' for all subscriptions missing the tier field",
  createJobs: async (emit, log) => {
    let subscriptionsQueued = 0;

    // Query all CurioSubscription entries with pagination
    log('Querying CurioSubscription table...');
    let nextToken: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const response = await creatorClient.models.CurioSubscription.list({
        limit: 1000,
        nextToken: nextToken,
        selectionSet: ['subscriptionId', 'tier'],
      });

      const subscriptions = response.data;
      nextToken = response.nextToken ?? undefined;
      hasMore = !!nextToken;

      if (subscriptions.length === 0) {
        continue;
      }

      // Filter for subscriptions missing the tier field
      for (const subscription of subscriptions) {
        // tier is optional and can be null/undefined
        if (!subscription.tier) {
          await emit({
            subscriptionId: subscription.subscriptionId,
          } as SubscriptionTierDefaultJob);
          subscriptionsQueued++;
        }
      }

      if (subscriptionsQueued % 100 === 0 && subscriptionsQueued > 0) {
        log(`Queued ${subscriptionsQueued} subscriptions missing tier so far...`);
      }
    }

    log(`Finished queuing ${subscriptionsQueued} subscriptions missing tier field`);
  },
});

