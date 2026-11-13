/** Node Mixpanel SDK host from `MIXPANEL_API_HOST` (e.g. `api-eu.mixpanel.com`). */
export function getMixpanelNodeInitOptions(): { host: string } | undefined {
  const host = process.env.MIXPANEL_API_HOST?.trim();
  return host ? { host } : undefined;
}
