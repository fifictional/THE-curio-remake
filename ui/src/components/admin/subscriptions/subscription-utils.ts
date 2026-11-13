import { type Subscription } from "@/hooks/api/subscriptions";

export function getStatusColor(status: Subscription['status']): string {
  switch (status) {
    case 'active':
      return 'text-emerald-600';
    case 'trialing':
      return 'text-blue-600';
    case 'paused':
      return 'text-amber-600';
    case 'cancelled':
      return 'text-red-600';
    case 'past_due':
      return 'text-orange-600';
    default:
      return 'text-gray-600';
  }
}

export function formatDate(date?: string | null): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

