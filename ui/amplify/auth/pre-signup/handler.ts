import type { PreSignUpTriggerHandler } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { getMixpanel } from '../../custom/ProcessDocument/common/mixpanel/mixpanel';
import { createUserInLoops } from '../utils/loops';
import { createUserInCustomerIO } from '../utils/customerio';

const currentBranch = process.env.AWS_BRANCH || "local";
const isRelease = currentBranch === "release";
const cognitoClient = new CognitoIdentityProviderClient();

export const handler: PreSignUpTriggerHandler = async (event) => {
  const email = event.request.userAttributes.email?.toLowerCase();
  const userPoolId = event.userPoolId;

  // EOPRD-817: Prevent duplicate accounts with same email across providers
  if (email && userPoolId) {
    try {
      console.log(`[pre-signup] Checking if email already exists: ${email}`);
      
      // Try to get user by email - works for both Email and Google signups
      const res = await cognitoClient.send(
        new AdminGetUserCommand({
          UserPoolId: userPoolId,
          Username: email,
        })
      );

      // If we get here, user exists - block the signup
      console.warn(
        `[pre-signup] Email ${email} already registered. Blocking duplicate sign-up.`
      );
      
      throw new Error(
        `An account with this email (${email}) already exists. Please sign in with your existing account instead of creating a new one.`
      );
    } catch (err: any) {
      if (err.name === "UserNotFoundException") {
        // Email doesn't exist - allow signup to proceed
        console.log(`[pre-signup] Email ${email} is new (not found in Cognito). Allowing signup.`);
      } else if (err.message?.includes('already exists')) {
        // Re-throw our custom error to block signup
        console.log(`[pre-signup] Blocking signup - ${err.message}`);
        throw err;
      } else {
        console.error(`[pre-signup] Error checking email in Cognito:`, err);
        // Don't block signup on other errors; just log and continue
      }
    }
  }

  // Auto-confirm and auto-verify email for local sandboxes (skip email verification)
  if (!isRelease && !event.response.autoConfirmUser) {
    event.response.autoConfirmUser = true;
    event.response.autoVerifyEmail = true;
  }

  if (process.env.SYNC_TO_LOOPS === 'true') {
    await createUserInLoops(
      event.request.userAttributes.email,
      event.request.userAttributes.given_name,
      event.request.userAttributes.family_name
    );
  }
  if (process.env.SYNC_TO_CUSTOMERIO === 'true') {
    await createUserInCustomerIO(
      event.request.userAttributes.email,
      event.request.userAttributes.given_name,
      event.request.userAttributes.family_name
    );
  }

  const mixToken = process.env.MIXPANEL_TOKEN;
  if (!mixToken) {
    console.error("Mix API key is not set");
    return event;
  }

  const mixpanel = await getMixpanel(mixToken);

  mixpanel?.track("pre-signed-request", {
    distinct_id: event.request.userAttributes.email,
    email: event.request.userAttributes.email,
    firstName: event.request.userAttributes.given_name,
    lastName: event.request.userAttributes.family_name,
  });

  return event;
};
