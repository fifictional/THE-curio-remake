/**
 * Customer.io utility functions for subscription updates
 */

import { Analytics } from '@customerio/cdp-analytics-node';

/**
 * Updates Customer.io with gift subscription attributes for the recipient
 * 
 * When a subscription is gifted, we need to track:
 * - When the gift was granted
 * - The gift message (if provided)
 * - The subscription tier
 * - The sender's email and name
 * 
 * @param recipientEmail - Email of the user receiving the gift
 * @param senderEmail - Email of the user who sent the gift
 * @param senderName - Name of the user who sent the gift
 * @param tier - Subscription tier ('super' or 'ultra')
 * @param message - Optional personal message from the sender
 * @param apiKey - Customer.io API key
 * @throws Error if API key is not set
 */
export async function updateGiftSubscriptionAttributes(
  recipientEmail: string,
  senderEmail: string,
  senderName: string,
  tier: 'super' | 'ultra',
  message: string | undefined,
  apiKey: string
): Promise<void> {
  if (!apiKey) {
    throw new Error('CUSTOMERIO_API_KEY is not set');
  }

  try {
    const analytics = new Analytics({
      writeKey: apiKey,
      host: 'https://cdp-eu.customer.io',
    });

    await analytics.identify({
      userId: recipientEmail,
      traits: {
        giftedSubDateTime: new Date().toISOString(),
        giftedSubMessage: message || '',
        giftedSubTier: tier,
        giftedSubSenderEmail: senderEmail,
        giftedSubSenderName: senderName,
      }
    }, (err: any) => {
      if (err) {
        console.error('[subscription-update] Error updating gift attributes in Customer.io:', err);
      } else {
        console.log('[subscription-update] Gift attributes updated in Customer.io for:', recipientEmail);
      }
    });

    await analytics.closeAndFlush();
  } catch (error) {
    console.error('[subscription-update] Error updating gift attributes in Customer.io:', error);
    // Don't throw - we don't want Customer.io failures to break the subscription flow
  }
}

