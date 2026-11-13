'use client';

import { AdminGate } from "@/components/admin/admin-gate";
import { SubscriptionManager } from "@/components/admin/subscriptions";

export default function SubscriptionsAdminPage() {
  return (
    <AdminGate>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Subscription Management</h1>
        <SubscriptionManager />
      </div>
    </AdminGate>
  );
}
