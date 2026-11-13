import type { Schema } from "../../../../data/resource";
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env as creatorEnv } from '$amplify/env/hono-heavy';
import { Amplify } from 'aws-amplify';
import { generateClient } from "aws-amplify/api";
import { registerCreator } from "../../../../common/batch-processing";
import { JOB_NAME, PopulateUserProfileJob } from "./interface";

// Initialize Amplify Data client for creator
const { resourceConfig: creatorResourceConfig, libraryOptions: creatorLibraryOptions } = await getAmplifyDataClientConfig(
  creatorEnv as any
);

Amplify.configure(creatorResourceConfig, creatorLibraryOptions);
const creatorClient = generateClient<Schema>();

// Register creator
registerCreator({
  name: "Populate User Profile",
  jobType: JOB_NAME,
  description: "Populate userEmail, firstName, and lastName in UserProfile from Cognito user attributes",
  createJobs: async (emit, log) => {
    let profilesQueued = 0;

    // Query all UserProfile entries with pagination
    log('Querying UserProfile table...');
    let nextToken: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const response = await creatorClient.models.UserProfile.list({
        limit: 1000,
        nextToken: nextToken,
        selectionSet: ['userUuid', 'userEmail', 'firstName', 'lastName'],
      });

      const profiles = response.data;
      nextToken = response.nextToken ?? undefined;
      hasMore = !!nextToken;

      if (profiles.length === 0) {
        continue;
      }

      // Filter for profiles missing userEmail, firstName, or lastName
      for (const profile of profiles) {
        // Check if any of the fields are missing
        if (!profile.userEmail || !profile.firstName || !profile.lastName) {
          await emit({
            userUuid: profile.userUuid,
          } as PopulateUserProfileJob);
          profilesQueued++;
        }
      }

      if (profilesQueued % 100 === 0 && profilesQueued > 0) {
        log(`Queued ${profilesQueued} profiles missing userEmail/firstName/lastName so far...`);
      }
    }

    log(`Finished queuing ${profilesQueued} profiles missing userEmail/firstName/lastName fields`);
  },
});
