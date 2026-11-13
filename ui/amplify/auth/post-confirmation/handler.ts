import type { PostConfirmationTriggerHandler } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand
} from '@aws-sdk/client-cognito-identity-provider';
import { getMixpanel } from '../../custom/ProcessDocument/common/mixpanel/mixpanel';
import type { Schema } from '../../data/resource';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/post-confirmation';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import { checkAndGrantPartnershipSubscription } from '../../utils/partnership-utils';
import { createHash } from 'crypto';
import { trackMetaConversion } from '../../utils/meta';
import { verifyUserInCustomerIO } from '../utils/customerio';
import { verifyUserInLoops } from '../utils/loops';

const cognitoClient = new CognitoIdentityProviderClient();

// Initialize Amplify Data client
const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  env as any
);
Amplify.configure(resourceConfig, libraryOptions);
const dataClient = generateClient<Schema>();

// add user to group
export const handler: PostConfirmationTriggerHandler = async (event) => {
  const command = new AdminAddUserToGroupCommand({
    GroupName: 'student',
    Username: event.userName,
    UserPoolId: event.userPoolId
  });
  const response = await cognitoClient.send(command);

  const userId =  event.request.userAttributes.sub;
  const userEmail = event.request.userAttributes.email;
  
  /*
    Create Mix panel user and track signup event
  */

  const mixToken = process.env.MIXPANEL_TOKEN;
  if (!mixToken) {
    console.error("Mix API key is not set");
  }
  const mixpanel = await getMixpanel(mixToken);
  
  mixpanel?.track("user-verified-email", {
    distinct_id: userId,
    email: userEmail,
    firstName: event.request.userAttributes.given_name,
    lastName: event.request.userAttributes.family_name,
  });
  
  mixpanel?.people.set(userId, {
    $email: userEmail,
    $first_name: event.request.userAttributes.given_name,
    $last_name: event.request.userAttributes.family_name,
    signupDate: new Date().toISOString(),
    userId: userId,
  });

  // if user email ends with @educate-online.org, add to admin group
  if (userEmail?.endsWith('@educate-online.org')) {
    const command = new AdminAddUserToGroupCommand({
      GroupName: 'admin',
      Username: event.userName,
      UserPoolId: event.userPoolId
    });
    const response = await cognitoClient.send(command);
  }

  // create user profile
  await dataClient.models.UserProfile.create({
    userUuid: userId,
    userEmail: userEmail,
    firstName: event.request.userAttributes.given_name,
    lastName: event.request.userAttributes.family_name,
    onboardingCompleted: false,
    onboardingSkipped: false,
  });

  // Check if user is a partnership future user and grant subscription if needed
  if (userEmail && userId) {
    await checkAndGrantPartnershipSubscription(dataClient, userEmail, userId, '[post-confirmation]');
  }

  if (process.env.SYNC_TO_LOOPS === 'true') {
    await verifyUserInLoops(event.request.userAttributes.email, event.request.userAttributes.given_name, event.request.userAttributes.family_name);
  }
  if (process.env.SYNC_TO_CUSTOMERIO === 'true') {
    await verifyUserInCustomerIO(event.request.userAttributes.email, event.request.userAttributes.given_name, event.request.userAttributes.family_name);
  }

  // Track marketing conversion with Meta
  await trackMetaConversion(userEmail, userId, 'CompleteRegistration', event.request.userAttributes.given_name, event.request.userAttributes.family_name);

  return event;
};
