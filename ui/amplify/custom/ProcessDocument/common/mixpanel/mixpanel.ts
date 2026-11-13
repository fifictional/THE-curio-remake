import Mixpanel from "mixpanel";
import { getMixpanelKey } from "../secrets/get-mixpanel-key";
import { getMixpanelNodeInitOptions } from "./mixpanel-client-options";

export const getMixpanel = async (MIXPANEL_TOKEN?: string) => {
  // if branch is local, return null
  if (process.env.AWS_BRANCH === 'local') {
    return {
      track: (event: string, properties: Record<string, any>) => {
        console.log(`TrackEvent: ${event} - ${JSON.stringify(properties)}`);
      },
      identify: (uniqueId: string) => {
        console.log(`unique_id: ${uniqueId}`);
      },
      people: {
        set: (identity: string , properties: Record<string, any>) => {
          console.log(`${identity} PeopleSet: ${JSON.stringify(properties)}`);
        }
      }
    };
  }

  const mixpanelSecret = MIXPANEL_TOKEN || await getMixpanelKey();
  if (mixpanelSecret) {
    return Mixpanel.init(mixpanelSecret, getMixpanelNodeInitOptions());
  }

  return null;
};

