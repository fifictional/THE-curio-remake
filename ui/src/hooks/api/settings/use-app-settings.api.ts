import { AppSettings } from "@/lib/types/app-settings";
import { useAmplifyApiClient } from "@/providers/amplify-provider";
import { useQuery } from "@tanstack/react-query";
import { v4 as uuidv4 } from 'uuid';

export const useAppSettingsApi = () => {
  const client = useAmplifyApiClient();

  const getAppSettings = async () => {
    const response = await client.models.AppSettings.list();

    if (response.data.length === 0) {

      const appSettingsUuid = uuidv4();
      await client.models.AppSettings.create({ appSettingsUuid, featureFlags: [] });

      return {
        appSettingsUuid,
        featureFlags: [],
        maintenanceMessage: undefined,
      } as AppSettings;
    }

    return response.data[0] as AppSettings;
  };

  const { data, isLoading } = useQuery<AppSettings>({
    queryKey: ['app-settings'],
    queryFn: getAppSettings,
  });

  return {
    appSettings: data,
    isLoading
  }
}