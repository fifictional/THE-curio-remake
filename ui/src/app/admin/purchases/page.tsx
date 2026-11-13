'use client';

import { useMemo, useState } from "react";
import { AdminGate } from "@/components/admin/admin-gate";
import { useSessionContext } from "@/providers/session-provider";
import { usePurchasedBundlesApi, type UserSummary } from "@/hooks/api/bundles";
import { useBundlesApi } from "@/hooks/api/bundles/use-bundles.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { useAnalytics } from "@/providers/analytics-provider";
import { cn } from "@/lib/utils";
import { UserSearch } from "@/components/admin/user-search";

// source is implied as manual for admin grants

export default function PurchasesAdminPage() {
  return (
    <AdminGate>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Bundle Ownership</h1>
        <PurchaseManager />
      </div>
    </AdminGate>
  );
}

function PurchaseManager() {
  const { track } = useAnalytics();
  const { bundles } = useBundlesApi();
  const { userAttributes } = useSessionContext();
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);

  const {
    purchases,
    activePurchases,
    isLoading,
    grant,
    revoke,
    reinstate,
    remove,
  } = usePurchasedBundlesApi(selectedUser?.userId || null);

  const selectedPurchases = purchases;

  const activeBundleIds = useMemo(() => new Set(activePurchases.map((purchase) => purchase.bundleUuid)), [activePurchases]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-4 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold">Find Customer</h2>
        <p className="text-sm text-muted-foreground">Search by email, then select the correct account if there are multiple.</p>
        <UserSearch onSelect={(u) => { setSelectedUser(u); }} />
        {selectedUser && (
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-medium">Selected user</div>
                <div className="text-muted-foreground">{selectedUser.email}</div>
              </div>
              <div className="text-muted-foreground text-xs">{selectedUser.userId}</div>
            </div>
          </div>
        )}
      </div>

      {selectedUser && (
      <div className="rounded-lg border bg-white shadow-sm">
        <div className="border-b p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Purchases</h2>
            <p className="text-sm text-muted-foreground">Active and revoked bundles for the selected user.</p>
          </div>
          <GrantPurchaseDialog
            bundles={bundles || []}
            onGrant={async ({ bundleUuid }) => {
              if (!userAttributes?.userUuid) return;
              await grant({ 
                bundleUuid,
                modifyingUserId: userAttributes.userUuid,
              });
              track('bundle-granted', {
                bundleUuid,
                userId: selectedUser.userId,
              });
            }}
            disabled={!selectedUser}
            ownedBundleIds={activeBundleIds}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Bundle</th>
                <th className="px-4 py-2 text-left font-medium">Source</th>
                <th className="px-4 py-2 text-left font-medium">Purchased At</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {selectedPurchases.map((purchase) => {
                const bundle = bundles?.find((candidate) => candidate.bundleUuid === purchase.bundleUuid);
                const isActive = !purchase.revokedAt;
                return (
                  <tr key={`${purchase.userId}-${purchase.bundleUuid}`} className={cn(!isActive && 'bg-muted/30')}>
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium">{bundle?.name || purchase.bundleUuid}</div>
                      <div className="text-xs text-muted-foreground">{purchase.bundleUuid}</div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="capitalize">{purchase.source}</div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <time className="text-xs text-muted-foreground">
                        {new Date(purchase.purchasedAt).toLocaleString()}
                      </time>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className={cn('text-xs font-semibold', isActive ? 'text-emerald-600' : 'text-red-600')}>
                        {isActive ? 'Active' : `Revoked ${purchase.revokedAt ? new Date(purchase.revokedAt).toLocaleDateString() : ''}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      <div className="flex justify-end gap-2">
                        {isActive ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 rounded-lg"
                            onClick={async () => {
                              if (!userAttributes?.userUuid) return;
                              await revoke({ 
                                bundleUuid: purchase.bundleUuid,
                                modifyingUserId: userAttributes.userUuid,
                              });
                              track('bundle-revoked', {
                                bundleUuid: purchase.bundleUuid,
                                userId: purchase.userId,
                                source: purchase.source,
                              });
                            }}
                          >
                            Revoke
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 rounded-lg"
                            onClick={async () => {
                              await reinstate({ bundleUuid: purchase.bundleUuid });
                              track('bundle-reinstated', {
                                bundleUuid: purchase.bundleUuid,
                                userId: purchase.userId,
                                source: purchase.source,
                              });
                            }}
                          >
                            Reinstate
                          </Button>
                        )}
                        {purchase.source === 'manual' || true ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 rounded-lg"
                            onClick={async () => {
                              await remove({ bundleUuid: purchase.bundleUuid });
                              track('bundle-removed', {
                                bundleUuid: purchase.bundleUuid,
                                userId: purchase.userId,
                              });
                            }}
                          >
                            Delete
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!selectedPurchases.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">
                    {isLoading ? 'Loading purchases…' : 'No purchases found for this user.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
}

function GrantPurchaseDialog({
  bundles,
  onGrant,
  disabled,
  ownedBundleIds,
}: {
  bundles: Array<{ bundleUuid: string; name: string }>;
  onGrant: (payload: { bundleUuid: string }) => Promise<void>;
  disabled: boolean;
  ownedBundleIds: Set<string>;
}) {
  const [bundleUuid, setBundleUuid] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableBundles = useMemo(() => {
    const list = (bundles || []).filter((bundle) => !ownedBundleIds.has(bundle.bundleUuid));
    return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [bundles, ownedBundleIds]);

  const handleSubmit = async () => {
    if (!bundleUuid) {
      setError('Select a bundle to grant.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onGrant({ bundleUuid });
      setBundleUuid('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Select value={bundleUuid} onValueChange={setBundleUuid} disabled={disabled} placeholder="Select bundle" className="sm:w-48">
        {availableBundles.map((bundle) => (
          <SelectItem key={bundle.bundleUuid} value={bundle.bundleUuid}>
            {bundle.name}
          </SelectItem>
        ))}
      </Select>
      <Button onClick={handleSubmit} disabled={disabled || isSubmitting || !availableBundles.length}>
        {isSubmitting ? 'Granting…' : 'Grant Bundle'}
      </Button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

