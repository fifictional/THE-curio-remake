import { Analytics } from '@customerio/cdp-analytics-node'

const baseUrl = "https://cdp-eu.customer.io"
export const createUserInCustomerIO = async (email: string, firstName: string, lastName: string) => {
  const customerIoApiKey = process.env.CUSTOMERIO_API_KEY;
  if (!customerIoApiKey) {
    console.error("CustomerIO API key is not set");
    return;
  }

  console.log("Creating user in CustomerIO:", email, firstName, lastName);
  console.log("CustomerIO API key:", customerIoApiKey.substring(0, 8) + '...');
  console.log("CustomerIO host:", baseUrl);

  try {
    const analytics = new Analytics({
      writeKey: customerIoApiKey,
      host: baseUrl,
    })

    await analytics.identify({
      userId: email,
      traits: {
        name: `${firstName} ${lastName}`,
        firstName,
        lastName,
        lastLogin: new Date().getTime(),
        source: "cognito",
        emailVerified: false,
      }
    }, (err: any) => {
      console.error("Error creating user in CustomerIO:", err);
      console.log("User created in CustomerIO:", email);
    });
    await analytics.closeAndFlush();
  } catch (error) {
    console.error("Error creating user in CustomerIO:", error);
  }
}

// verify user in CustomerIO
// google auth users will not be created, but the update creates them
export const verifyUserInCustomerIO = async (email: string, firstName: string, lastName: string) => {
  const customerIoApiKey = process.env.CUSTOMERIO_API_KEY;
  if (!customerIoApiKey) {
    console.error("CustomerIO API key is not set");
    return;
  }

  try {
    const analytics = new Analytics({
      writeKey: customerIoApiKey,
      host: baseUrl,
    })

    await analytics.identify({
      userId: email,
      traits: {
        name: `${firstName} ${lastName}`,
        firstName,
        lastName,
        lastLogin: new Date().getTime(),
        source: "cognito",
        emailVerified: true,
      }
    }, (err: any) => {
      if (err) {
        console.error("Error verifying user in CustomerIO:", JSON.stringify(err, null, 2));
      } else {
        console.log("User verified in CustomerIO:", email);
      }
    });
    await analytics.closeAndFlush();
  } catch (error) {
    console.error("Error verifying user in CustomerIO:", JSON.stringify(error, null, 2));
  }
}

export const updateLastLoginDateCustomerIO = async (email: string) => {
  const customerIoApiKey = process.env.CUSTOMERIO_API_KEY;
  if (!customerIoApiKey) {
    console.error("CustomerIO API key is not set");
    return;
  }

  try {
    const analytics = new Analytics({
      writeKey: customerIoApiKey,
      host: baseUrl, 
    })

    await analytics.identify({
      userId: email,
      traits: {
        lastLogin: new Date().toISOString()
      }
    }, (err: any) => {
      if (err) {
        console.error("Error updating last login date in CustomerIO:", JSON.stringify(err, null, 2));
      }
    });
    await analytics.closeAndFlush();
  } catch (error) {
    console.error("Generic error updating last login date in CustomerIO:", JSON.stringify(error, null, 2));
  }
}

export const updateDataCustomerIO = async (data: Record<string, any>) => {
  const { email, traits, event, eventProperties } = data;
  const customerIoApiKey = process.env.CUSTOMERIO_API_KEY;
  if (!email) {
    console.error("Email is required");
    return;
  }

  if (!customerIoApiKey) {
    console.error("CustomerIO API key is not set");
    return;
  }

  const analytics = new Analytics({
    writeKey: customerIoApiKey,
    host: baseUrl,
  });

  // Update traits if provided
  if (traits && Object.keys(traits).length > 0) {
    await analytics.identify({
      userId: email,
      traits,
    }, (err: any) => {
      if (err) {
        console.error('[send-cio] Error updating traits in Customer.io:', err);
      } else {
        console.log('[send-cio] Traits updated in Customer.io for:', email);
      }
    });
  }

  // Track event if provided
  if (event) {
    await analytics.track({
      userId: email,
      event,
      properties: eventProperties || {},
    }, (err: any) => {
      if (err) {
        console.error('[send-cio] Error tracking event in Customer.io:', err);
      } else {
        console.log('[send-cio] Event tracked in Customer.io for:', email, event);
      }
    });
  }

  await analytics.closeAndFlush();
}