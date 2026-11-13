'use client';

import { Handshake, Users } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export default function PartnershipsPage() {
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold mb-2">Partnerships</h1>
        <p className="text-muted-foreground">
          Manage partners and partnership users
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Link
          href="/admin/partnerships/partners"
          prefetch={false}
          className={cn(buttonVariants({ variant: 'outline' }), "h-32 relative group hover:border-primary")}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Handshake className="w-8 h-8 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="block font-medium">Partners</span>
              <span className="text-sm text-muted-foreground">Manage partner organizations</span>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/partnerships/users"
          prefetch={false}
          className={cn(buttonVariants({ variant: 'outline' }), "h-32 relative group hover:border-primary")}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Users className="w-8 h-8 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="block font-medium">Users</span>
              <span className="text-sm text-muted-foreground">Manage partnership users</span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

