import type { Schema } from '../data/resource';
import { generateClient } from 'aws-amplify/api';
import { v4 as uuidv4 } from 'uuid';

type DataClient = ReturnType<typeof generateClient<Schema>>;

/**
 * Check if a user is a partnership future user and grant subscription if needed
 * @param dataClient - Amplify Data client
 * @param email - User email address
 * @param userId - User ID (sub from Cognito)
 * @param logPrefix - Prefix for log messages (e.g., '[post-authentication]' or '[post-confirmation]')
 */
export async function checkAndGrantPartnershipSubscription(
  dataClient: DataClient,
  email: string,
  userId: string,
  logPrefix: string = '[partnership]'
): Promise<void> {
  try {
    // Query FutureUser by email using the email index
    const futureUserResponse = await dataClient.models.FutureUser.list({
      filter: {
        email: { eq: email }
      }
    });

    if (futureUserResponse.errors) {
      console.error(`${logPrefix} Error querying FutureUser:`, futureUserResponse.errors);
      return;
    }

    const futureUsers = futureUserResponse.data || [];
    if (futureUsers.length === 0) {
      // User is not a partnership future user
      return;
    }

    // Get the first future user (should only be one per email)
    const futureUser = futureUsers[0];
    
    // Check if subscription has already been granted
    if (futureUser.subscriptionGranted === true) {
      console.log(`${logPrefix} Subscription already granted for ${email}`);
      return;
    }

    // Check if subEndDate exists
    if (!futureUser.subEndDate) {
      console.log(`${logPrefix} No subscription end date for ${email}, skipping subscription grant`);
      return;
    }

    const now = new Date();
    const endDate = new Date(futureUser.subEndDate);
    
    // Only grant if end date is in the future
    if (endDate <= now) {
      console.log(`${logPrefix} Subscription end date has passed for ${email}, skipping subscription grant`);
      return;
    }

    // Use subStartDate if available, otherwise use now
    const startDate = futureUser.subStartDate ? new Date(futureUser.subStartDate) : now;

    console.log(`${logPrefix} Creating subscription for ${email} with provider ${futureUser.provider}`);
    // Create subscription
    const subscriptionResponse = await dataClient.models.CurioSubscription.create({
      subscriptionId: uuidv4(),
      userId: userId,
      provider: futureUser.provider,
      status: 'active',
      tier: futureUser.tier,
      currentPeriodStart: startDate.toISOString(),
      currentPeriodEnd: endDate.toISOString(),
      nextBillingDate: endDate.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    } as any);

    if (subscriptionResponse.errors) {
      console.error(`${logPrefix} Error creating subscription:`, JSON.stringify(subscriptionResponse.errors));
      return;
    }

    // Update FutureUser to mark subscription as granted
    const updateResponse = await dataClient.models.FutureUser.update({
      futureUserUuid: futureUser.futureUserUuid,
      subscriptionGranted: true,
      subscriptionGrantedAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });

    if (updateResponse.errors) {
      console.error(`${logPrefix} Error updating FutureUser:`, updateResponse.errors);
      return;
    }

    console.log(`${logPrefix} Successfully granted subscription to ${email} until ${endDate.toISOString()}`);
  } catch (error) {
    console.error(`${logPrefix} Error checking/granting partnership subscription:`, error);
  }
}

