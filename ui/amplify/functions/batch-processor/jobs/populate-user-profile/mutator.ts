import type { Schema } from "../../../../data/resource";
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env as mutatorEnv } from '$amplify/env/batch-mutator';
import { Amplify } from 'aws-amplify';
import { generateClient } from "aws-amplify/api";
import { registerMutator } from "../../../../common/batch-processing";
import { JOB_NAME, PopulateUserProfileJob } from "./interface";
import { CognitoIdentityProviderClient, ListUsersCommand } from "@aws-sdk/client-cognito-identity-provider";
import { getUserPoolId } from "../../../../utils/lambda-utils";

// Initialize Amplify Data client for mutator
const { resourceConfig: mutatorResourceConfig, libraryOptions: mutatorLibraryOptions } = await getAmplifyDataClientConfig(
  mutatorEnv as any
);

Amplify.configure(mutatorResourceConfig, mutatorLibraryOptions);
const mutatorClient = generateClient<Schema>();

const cognitoClient = new CognitoIdentityProviderClient();

// Register mutator
registerMutator({
  jobType: JOB_NAME,
  processJob: async (job: PopulateUserProfileJob, log, jobId: string) => {
    const { userUuid } = job;
    
    log(`Processing user ${userUuid}`);

    try {
      // Get Cognito User Pool ID
      const userPoolId = getUserPoolId();
      if (!userPoolId) {
        throw new Error('COGNITO_USER_POOL_ID environment variable is not set');
      }

      // Fetch user from Cognito
      const cognitoResponse = await cognitoClient.send(
        new ListUsersCommand({
          UserPoolId: userPoolId,
          Filter: `sub = "${userUuid}"`,
          Limit: 1,
        })
      );

      if (!cognitoResponse.Users || cognitoResponse.Users.length === 0) {
        log(`User ${userUuid} not found in Cognito, skipping`);
        return; // Skip this user, don't throw error
      }

      const cognitoUser = cognitoResponse.Users[0];
      
      // Extract attributes from Cognito user
      const attributes = new Map(
        (cognitoUser.Attributes || []).map((attr) => [attr.Name || '', attr.Value || ''])
      );

      const email = attributes.get('email') || null;
      const firstName = attributes.get('given_name') || null;
      const lastName = attributes.get('family_name') || null;

      // If all fields are missing, skip update
      if (!email && !firstName && !lastName) {
        log(`User ${userUuid} has no email/firstName/lastName in Cognito, skipping`);
        return;
      }

      // Build update object with only fields that exist
      const updateData: any = {
        userUuid,
      };

      if (email) updateData.userEmail = email;
      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;

      // Update UserProfile
      const response = await mutatorClient.models.UserProfile.update(updateData);

      if (response.errors) {
        throw new Error(`Failed to update UserProfile: ${response.errors[0].message}`);
      }

      log(`Successfully updated UserProfile for user ${userUuid} with email=${email}, firstName=${firstName}, lastName=${lastName}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`Error updating UserProfile for user ${userUuid}: ${errorMessage}`);
      throw error;
    }
  },
});
