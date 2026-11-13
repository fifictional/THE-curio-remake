"use client";

import { cn } from '@/lib/utils';

interface MaintenanceMessageBannerProps {
  message: string;
  className?: string;
}

export function MaintenanceMessageBanner({ message, className }: MaintenanceMessageBannerProps) {
  if (!message) return null;

  return (
    <div
      className={cn(
        "w-full bg-black text-white px-4 py-2 text-sm h-10 flex items-center",
        className
      )}
    >
      <span>{message}</span>
    </div>
  );
}

