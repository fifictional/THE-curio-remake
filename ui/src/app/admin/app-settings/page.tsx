"use client";

import { useAppSettingsApi } from "@/hooks/api/settings/use-app-settings.api";
import { useAmplifyApiClient } from "@/providers/amplify-provider";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { FeatureFlag } from "@/lib/types/app-settings";

export default function AppSettingsPage() {
  const { appSettings, isLoading } = useAppSettingsApi();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [maintenanceMessage, setMaintenanceMessage] = useState<string>("");
  const client = useAmplifyApiClient();
  const queryClient = useQueryClient();
  const isEmpty = useMemo(() => (flags?.length ?? 0) === 0, [flags]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingMaintenance, setIsSavingMaintenance] = useState(false);
  const [memoryFeatureEnabled, setMemoryFeatureEnabled] = useState(true);
  const [isSavingMemory, setIsSavingMemory] = useState(false);

  const normalizeFlagValue = useCallback((value: unknown): FeatureFlag["flagValue"] => {
    if (value === "active" || value === "inactive" || value === "admin_only") return value;
    if (value === "admin_only,") return "admin_only";
    return "inactive";
  }, []);

  useEffect(() => {
    if (appSettings?.featureFlags) {
      const mapped: FeatureFlag[] = (appSettings.featureFlags as any[]).map((f) => ({
        flagName: String(f?.flagName ?? ""),
        flagValue: normalizeFlagValue((f as any)?.flagValue) as FeatureFlag["flagValue"],
      }));
      if (!mapped.some((f) => f.flagName === "memory_tracking")) {
        mapped.push({ flagName: "memory_tracking", flagValue: "inactive" });
      }
      setFlags(mapped);
    }
    if (appSettings?.maintenanceMessage !== undefined) {
      setMaintenanceMessage(appSettings.maintenanceMessage || "");
    }
    if (appSettings?.memoryFeatureEnabled !== undefined && appSettings.memoryFeatureEnabled !== null) {
      setMemoryFeatureEnabled(appSettings.memoryFeatureEnabled);
    }
  }, [appSettings, normalizeFlagValue]);

  const persist = useCallback(async (nextFlags: FeatureFlag[]) => {
    if (!appSettings?.appSettingsUuid) return;

    setIsSaving(true);
    try {
      await client.models.AppSettings.update({
        appSettingsUuid: appSettings.appSettingsUuid,
        featureFlags: nextFlags,
      });
      await queryClient.invalidateQueries({ queryKey: ["app-settings"] });
    } finally {
      setIsSaving(false);
    }
  }, [client, queryClient, appSettings]);

  const updateFlagValue = useCallback((name: string, value: FeatureFlag["flagValue"]) => {
    setFlags((prev) => {
      const next = prev.map((f) => f.flagName === name ? { ...f, flagValue: value } : f);
      void persist(next);
      return next;
    });
  }, [persist]);

  const deleteFlag = useCallback((name: string) => {
    setFlags((prev) => {
      const next = prev.filter((f) => f.flagName !== name);
      void persist(next);
      return next;
    });
  }, [persist]);

  const addFlag = useCallback(() => {
    const name = window.prompt("New feature flag name?")?.trim();
    if (!name) return;
    if (flags.some((f) => f.flagName === name)) return;
    const next: FeatureFlag[] = [...flags, { flagName: name, flagValue: "inactive" } as const];
    setFlags(next);
    void persist(next);
  }, [flags, persist]);

  const persistMaintenanceMessage = useCallback(async (message: string | null) => {
    if (!appSettings?.appSettingsUuid) return;

    setIsSavingMaintenance(true);
    try {
      const updateData: { appSettingsUuid: string; maintenanceMessage?: string | null } = {
        appSettingsUuid: appSettings.appSettingsUuid,
      };
      
      if (message === null || message === "") {
        // Explicitly set to null to remove the field
        updateData.maintenanceMessage = null;
      } else {
        updateData.maintenanceMessage = message;
      }
      
      await client.models.AppSettings.update(updateData);
      await queryClient.invalidateQueries({ queryKey: ["app-settings"] });
    } finally {
      setIsSavingMaintenance(false);
    }
  }, [client, queryClient, appSettings]);

  const handleSetMaintenanceMessage = useCallback(() => {
    void persistMaintenanceMessage(maintenanceMessage || null);
  }, [maintenanceMessage, persistMaintenanceMessage]);

  const handleClearMaintenanceMessage = useCallback(() => {
    setMaintenanceMessage("");
    void persistMaintenanceMessage(null);
  }, [persistMaintenanceMessage]);

  const persistMemoryFeature = useCallback(async (enabled: boolean) => {
    if (!appSettings?.appSettingsUuid) return;
    setIsSavingMemory(true);
    try {
      await client.models.AppSettings.update({
        appSettingsUuid: appSettings.appSettingsUuid,
        memoryFeatureEnabled: enabled,
      });
      setMemoryFeatureEnabled(enabled);
      await queryClient.invalidateQueries({ queryKey: ["app-settings"] });
    } finally {
      setIsSavingMemory(false);
    }
  }, [client, queryClient, appSettings]);

  return (
    <div className="container p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">App Settings</h1>
        <button
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-100"
          onClick={addFlag}
          disabled={isLoading}
        >
          <Plus className="h-4 w-4" /> Add feature flag
        </button>
      </div>

      <div className="mb-8 rounded-lg border p-6">
        <h2 className="mb-4 text-lg font-semibold">Persistent Memory</h2>
        <p className="mb-4 text-sm text-gray-600">
          Global kill switch and rollout flag for agentic memory (gaps, mastered topics, chat reflection).
        </p>
        <label className="mb-2 flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={memoryFeatureEnabled}
            disabled={isLoading || isSavingMemory}
            onChange={(e) => void persistMemoryFeature(e.target.checked)}
          />
          Memory feature enabled (platform-wide)
        </label>
        <p className="text-xs text-gray-500">
          Set <strong>memory_tracking</strong> in the table below for staged rollout (active / inactive / admin only).
        </p>
        {isSavingMemory && (
          <p className="mt-2 text-xs text-gray-500">Saving memory settings…</p>
        )}
      </div>

      {/* Maintenance Message Section */}
      <div className="mb-8 rounded-lg border p-6">
        <h2 className="mb-4 text-lg font-semibold">Maintenance Message</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="maintenance-message" className="mb-2 block text-sm font-medium text-gray-700">
              Message to display at the top of the site
            </label>
            <input
              id="maintenance-message"
              type="text"
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
              placeholder="Enter maintenance message..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={isLoading || isSavingMaintenance}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSetMaintenanceMessage}
              disabled={isLoading || isSavingMaintenance}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-100 disabled:opacity-50"
            >
              Set
            </button>
            <button
              onClick={handleClearMaintenanceMessage}
              disabled={isLoading || isSavingMaintenance || !appSettings?.maintenanceMessage}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-100 disabled:opacity-50"
            >
              Clear
            </button>
          </div>
          {isSavingMaintenance && (
            <div className="text-xs text-gray-500">Saving changes…</div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-600">Loading...</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Flag</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {isEmpty ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-600">No feature flags yet.</td>
                </tr>
              ) : (
                flags.map((f) => (
                  <tr key={f.flagName} className="text-sm">
                    <td className="px-4 py-3 font-medium text-gray-900">{f.flagName}</td>
                    <td className="px-4 py-3">
                      <select
                        className="rounded-md border px-3 py-2 text-sm"
                        value={f.flagValue}
                        onChange={(e) => updateFlagValue(f.flagName, e.target.value as FeatureFlag["flagValue"])}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="admin_only">Admin only</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 hover:bg-red-50 hover:text-red-600"
                        onClick={() => deleteFlag(f.flagName)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {isSaving && (
        <div className="mt-3 text-xs text-gray-500">Saving changes…</div>
      )}
    </div>
  );
}