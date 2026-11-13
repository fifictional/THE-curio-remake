'use client';

import { type Subscription } from "@/hooks/api/subscriptions";
import { SubscriptionRow } from "./subscription-row";

interface SubscriptionsTableProps {
  subscriptions: Subscription[];
  isLoading: boolean;
  onPause: (subscriptionId: string) => Promise<void>;
  onCancel: (subscriptionId: string) => Promise<void>;
  onReactivate: (subscriptionId: string) => Promise<void>;
  onDelete: (subscriptionId: string) => Promise<void>;
}

export function SubscriptionsTable({
  subscriptions,
  isLoading,
  onPause,
  onCancel,
  onReactivate,
  onDelete,
}: SubscriptionsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-foreground">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Provider</th>
            <th className="px-4 py-2 text-left font-medium">Tier</th>
            <th className="px-4 py-2 text-left font-medium">Status</th>
            <th className="px-4 py-2 text-left font-medium">Period</th>
            <th className="px-4 py-2 text-left font-medium">Next Billing</th>
            <th className="px-4 py-2 text-left font-medium">Created</th>
            <th className="px-4 py-2 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {subscriptions.map((subscription) => (
            <SubscriptionRow
              key={subscription.subscriptionId}
              subscription={subscription}
              onPause={onPause}
              onCancel={onCancel}
              onReactivate={onReactivate}
              onDelete={onDelete}
            />
          ))}

          {!subscriptions.length && (
            <tr>
              <td colSpan={7} className="px-4 py-6 text-center text-sm text-muted-foreground">
                {isLoading ? 'Loading subscriptions…' : 'No subscriptions found for this user.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

