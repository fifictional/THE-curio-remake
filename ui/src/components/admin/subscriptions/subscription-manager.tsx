'use client';

import { useMemo, useState } from "react";
import { useSessionContext } from "@/providers/session-provider";
import { useSubscriptionsApi } from "@/hooks/api/subscriptions";
import { type UserSummary } from "@/hooks/api/bundles";
import { Select, SelectItem } from "@/components/ui/select";
import { useAnalytics } from "@/providers/analytics-provider";
import { UserSearch } from "@/components/admin/user-search";
import { GrantSubscriptionDialog } from "./grant-subscription-dialog";
import { SubscriptionsTable } from "./subscriptions-table";

export function SubscriptionManager() {
  const { track } = useAnalytics();
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const {
    subscriptions,
    isLoading,
    grant,
    cancel,
    pause,
    reactivate,
    remove,
  } = useSubscriptionsApi(selectedUser?.userId || null);

  const filteredSubscriptions = useMemo(() => {
    if (statusFilter === 'all') return subscriptions;
    return subscriptions.filter((sub) => sub.status === statusFilter);
  }, [subscriptions, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-4 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold">Find Customer</h2>
        <p className="text-sm text-muted-foreground">
          Search by email, then select the correct account if there are multiple.
        </p>
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
              <h2 className="text-lg font-semibold">Subscriptions</h2>
              <p className="text-sm text-muted-foreground">
                Manage active, paused, and cancelled subscriptions.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select 
                value={statusFilter} 
                onValueChange={setStatusFilter}
                placeholder="Filter by status"
                className="sm:w-40"
              >
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trialing">Trialing</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="past_due">Past Due</SelectItem>
              </Select>
              <GrantSubscriptionDialog
                onGrant={async ({ months, tier, status }) => {
                  await grant({ months, tier, status });
                  track('subscription-granted', {
                    userId: selectedUser.userId,
                    months,
                    tier,
                    status,
                  });
                }}
                disabled={!selectedUser}
              />
            </div>
          </div>
          <SubscriptionsTable
            subscriptions={filteredSubscriptions}
            isLoading={isLoading}
            onPause={async (subscriptionId) => {
              await pause({ subscriptionId });
              track('subscription-paused', { subscriptionId });
            }}
            onCancel={async (subscriptionId) => {
              await cancel({ subscriptionId });
              track('subscription-cancelled', { subscriptionId });
            }}
            onReactivate={async (subscriptionId) => {
              await reactivate({ subscriptionId });
              track('subscription-reactivated', { subscriptionId });
            }}
            onDelete={async (subscriptionId) => {
              await remove({ subscriptionId });
              track('subscription-deleted', { subscriptionId });
            }}
          />
        </div>
      )}
    </div>
  );
}

