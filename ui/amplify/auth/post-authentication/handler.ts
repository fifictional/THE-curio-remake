import type { PostAuthenticationTriggerHandler } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand
} from '@aws-sdk/client-cognito-identity-provider';
import type { Schema } from '../../data/resource';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/post-authentication';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import { checkAndGrantPartnershipSubscription } from '../../utils/partnership-utils';
import { updateLastLoginDateCustomerIO } from '../utils/customerio';
import { updateLastLoginDateLoops } from '../utils/loops';

const cognitoClient = new CognitoIdentityProviderClient();

// Initialize Amplify Data client
const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  env as any
);
Amplify.configure(resourceConfig, libraryOptions);
const dataClient = generateClient<Schema>();

// add user to group
export const handler: PostAuthenticationTriggerHandler = async (event) => {
  const command = new AdminAddUserToGroupCommand({
    GroupName: 'student',
    Username: event.userName,
    UserPoolId: event.userPoolId
  });
  const response = await cognitoClient.send(command);

  // if user email ends with @educate-online.org, add to admin group
  if (event.request.userAttributes.email?.endsWith('@educate-online.org')) {
    const command = new AdminAddUserToGroupCommand({
      GroupName: 'admin',
      Username: event.userName,
      UserPoolId: event.userPoolId
    });
    const response = await cognitoClient.send(command);
  }

  // Check if user is a partnership future user and grant subscription if needed
  const userEmail = event.request.userAttributes.email;
  const userId = event.request.userAttributes.sub;
  if (userEmail && userId) {
    await checkAndGrantPartnershipSubscription(dataClient, userEmail, userId, '[post-authentication]');
  }

  // Update lastLoginAt in UserProfile for canonical account selection (EOPRD-817: Phase 1)
  if (userId) {
    try {
      await dataClient.models.UserProfile.update({
        userUuid: userId,
        lastLoginAt: new Date().toISOString(),
      });
      console.log(`[post-authentication] Updated lastLoginAt for user: ${userId}`);
    } catch (error) {
      console.error(`[post-authentication] Failed to update lastLoginAt for ${userId}:`, error);
    }
  }

  if (process.env.SYNC_TO_LOOPS === 'true') {
    console.log("Updating last login date in Loops:", event.request.userAttributes.email);
    await updateLastLoginDateLoops(event.request.userAttributes.email);
  }

  if (process.env.SYNC_TO_CUSTOMERIO === 'true') {
    console.log("Updating last login date in CustomerIO:", event.request.userAttributes.email);
    await updateLastLoginDateCustomerIO(event.request.userAttributes.email);
  }

  return event;
};
