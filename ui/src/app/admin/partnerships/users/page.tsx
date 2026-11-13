'use client';

import { FutureUsersList } from "@/components/admin/future-users-list";

export default function PartnershipUsersPage() {
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold mb-2">Partnership Users</h1>
        <p className="text-muted-foreground">
          Manage partnership users and subscriptions
        </p>
      </div>

      <FutureUsersList />
    </div>
  );
}

