'use client';

import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";

export function NoPermission() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 p-8 max-w-md">
        <div className="flex justify-center">
          <div className="p-4 bg-muted rounded-full">
            <ShieldAlert className="w-12 h-12 text-primary" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to view this page. Please contact your administrator if you believe this is a mistake.
          </p>
        </div>
        <div className="flex justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
          >
            Go Back
          </Button>
          <Button
            onClick={() => {
              router.prefetch('/');
              router.push('/');
            }}
          >
            Return Home
          </Button>
        </div>
      </div>
    </div>
  );
}
