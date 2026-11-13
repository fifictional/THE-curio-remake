import { CognitoIdentityProviderClient, ListUsersCommand, AdminListGroupsForUserCommand } from "@aws-sdk/client-cognito-identity-provider";
import { TIER, UserTier } from "@ai-intents/tier";

const client = new CognitoIdentityProviderClient();

export const getUser = async (userPoolId: string, userUuid: string) => {
  const users = await client.send(
    new ListUsersCommand({
      UserPoolId: userPoolId,
      Filter: `sub = "${userUuid}"`, // exact-match filter
      Limit: 1,
    })
  );

  if (users.Users?.length === 0) {
    console.log('[lambda-utils] User not found', userPoolId, userUuid);
    return null;
  }

  return users.Users?.[0];
}

export const getUserRole = async (userPoolId: string, userUuid: string) => {
  const user = await getUser(userPoolId, userUuid);
  if (!user) {
    throw new Error('User not found');
  }

  const userGroups = await client.send(
    new AdminListGroupsForUserCommand({
      UserPoolId: userPoolId,
      Username: userUuid,
    })
  );

  const groups = userGroups.Groups?.map((group) => group.GroupName);
  
  return {
    groups,
  };
}

export const isAdmin = async (userPoolId: string, userUuid: string) => {
  const { groups } = await getUserRole(userPoolId, userUuid);
  return groups?.includes('admin') || false;
}

export const getUserPoolId = () => {
  return process.env.COGNITO_USER_POOL_ID;
}

/**
 * Get user tier based on subscription and admin status
 * Returns TIER.TECHNICAL for admins, subscription tier for subscribed users, TIER.FREE otherwise
 */
export async function getUserTier(
  client: any,
  userUuid: string
): Promise<UserTier> {
  const userPoolId = getUserPoolId();
  if (!userPoolId) {
    throw new Error('User pool ID is required');
  }

  // Get user subscriptions
  const subscriptions = await client.models.CurioSubscription.listCurioSubscriptionByUserIdAndCreatedAt({
    userId: userUuid,
  });
  
  if (subscriptions.errors) {
    console.error('Error getting subscriptions', JSON.stringify(subscriptions.errors));
    throw new Error(subscriptions.errors[0].message);
  }

  // Check if user is admin
  const userIsAdmin = await isAdmin(userPoolId, userUuid);
  if (userIsAdmin) {
    return TIER.TECHNICAL;
  }

  // Get subscription tier
  const subscriptionTier = subscriptions.data?.[0]?.tier || null; // 'super' | 'ultra' | null
  const isSubscribed = subscriptions.data?.[0]?.status === 'active' || subscriptions.data?.[0]?.status === 'trialing';
  
  if (isSubscribed && subscriptionTier) {
    return subscriptionTier as 'super' | 'ultra';
  }

  return TIER.FREE;
}

/**
 * Get comprehensive user tier and subscription information
 * Returns user tier, admin status, subscription tier, and subscription status
 * 
 * @param client - Amplify data client
 * @param userUuid - User UUID
 * @param treatAdminAsTechnical - If true (default), admins get TECHNICAL tier. If false, admins are treated like regular users.
 */
export async function getUserTierInfo(
  client: any,
  userUuid: string,
  treatAdminAsTechnical: boolean = true
): Promise<{
  userTier: UserTier;
  userIsAdmin: boolean;
  subscriptionTier: 'super' | 'ultra' | null;
  isUserSubscribed: boolean;
}> {
  const userPoolId = getUserPoolId();
  if (!userPoolId) {
    throw new Error('User pool ID is required');
  }

  // Get user subscriptions
  const subscriptions = await client.models.CurioSubscription.listCurioSubscriptionByUserIdAndCreatedAt({
    userId: userUuid,
  });
  
  if (subscriptions.errors) {
    console.error('Error getting subscriptions', JSON.stringify(subscriptions.errors));
    throw new Error(subscriptions.errors[0].message);
  }

  // Check if user is admin
  const userIsAdmin = await isAdmin(userPoolId, userUuid);
  const subscriptionTier = subscriptions.data?.[0]?.tier || null; // 'super' | 'ultra' | null
  const isSubscribed = subscriptions.data?.[0]?.status === 'active' || subscriptions.data?.[0]?.status === 'trialing';
  
  // Determine userTier: technical for admins (if flag is true), subscriptionTier for subscribed users, free otherwise
  let userTier: UserTier;
  if (userIsAdmin && treatAdminAsTechnical) {
    userTier = TIER.TECHNICAL;
  } else if (isSubscribed && subscriptionTier) {
    userTier = subscriptionTier as 'super' | 'ultra';
  } else {
    userTier = TIER.FREE;
  }

  return {
    userTier,
    userIsAdmin,
    subscriptionTier: subscriptionTier as 'super' | 'ultra' | null,
    isUserSubscribed: isSubscribed,
  };
}