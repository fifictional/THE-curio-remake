'use client';

import { PartnersList } from "@/components/admin/partners-list";

export default function PartnersPage() {
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold mb-2">Partners</h1>
        <p className="text-muted-foreground">
          Manage partner organizations
        </p>
      </div>

      <PartnersList />
    </div>
  );
}

