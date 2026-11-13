import { createHash } from "crypto";

export const trackMetaConversion = async (
  email: string,
  userId: string,
  eventName: string,
  firstName?: string,
  lastName?: string,
  customData?: Record<string, any>
) => {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
    console.warn("Meta pixel ID or access token is not set");
    return;
  }

  const shouldSendEvent = !!pixelId && !!accessToken;

  // Event data for Meta Conversions API
  // Meta requires SHA-256 hashed values for PII (email, first name, last name)
  const eventData = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    user_data: {
      em: email ? hashValue(email) : undefined,
      external_id: userId,
      fn: firstName ? hashValue(firstName) : undefined,
      ln: lastName ? hashValue(lastName) : undefined,
    },
    ...(customData ? { custom_data: customData } : {}),
    action_source: 'website',
  };

  if (shouldSendEvent) {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v21.0/${pixelId}/events`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: [eventData],
            access_token: accessToken,
          }),
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        console.error("Meta Conversions API error:", result);
      } else {
        console.log("Meta conversion event sent successfully:", result);
      }
    } catch (error) {
      console.error("Error sending event to Meta Conversions API:", error);
    }
  } else {
    // Development/localhost: just log the event
    console.log("[DEV] Meta conversion event (would be sent in production):", JSON.stringify(eventData, null, 2));
  }
}


const hashValue = (value: string): string => {
  return createHash('sha256').update(value.toLowerCase().trim()).digest('hex');
};
  