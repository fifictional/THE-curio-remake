export type AppSettings = {
  appSettingsUuid: string;
  featureFlags: FeatureFlag[];
  maintenanceMessage?: string;
  memoryFeatureEnabled?: boolean | null;
};

export type FeatureFlag = {
  flagName: string;
  flagValue: "active" | "inactive" | "admin_only";
};