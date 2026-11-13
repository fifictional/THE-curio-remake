import Mixpanel from "mixpanel";

import { getMixpanelNodeInitOptions } from "./mixpanel-client-options";

export const getMixpanel = async () => {
  const mixpanelSecret = process.env.MIXPANEL_TOKEN;
  if (!mixpanelSecret) {
    console.warn('MIXPANEL_TOKEN is not set');
    return null;
  }

  // if branch is local, return null
  if (process.env.AWS_BRANCH === 'local') {
    return {
      people: {
        set: (userId: string) => {
          console.log(`Identify: ${userId}`);
        }
      },
      track: (event: string, properties: Record<string, any>) => {
        console.log(`TrackEvent: ${event} - ${JSON.stringify(properties)}`);
      },
    };
  }

  return Mixpanel.init(mixpanelSecret, getMixpanelNodeInitOptions());
};

