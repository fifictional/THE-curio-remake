'use client';

import { type Subscription } from "@/hooks/api/subscriptions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Calendar, Clock, Pause, Play, Trash2, X } from "lucide-react";
import { getStatusColor, formatDate } from "./subscription-utils";

interface SubscriptionRowProps {
  subscription: Subscription;
  onPause: (subscriptionId: string) => Promise<void>;
  onCancel: (subscriptionId: string) => Promise<void>;
  onReactivate: (subscriptionId: string) => Promise<void>;
  onDelete: (subscriptionId: string) => Promise<void>;
}

export function SubscriptionRow({
  subscription,
  onPause,
  onCancel,
  onReactivate,
  onDelete,
}: SubscriptionRowProps) {
  const isActive = subscription.status === 'active' || subscription.status === 'trialing';
  const isPaused = subscription.status === 'paused';
  const isCancelled = subscription.status === 'cancelled';

  return (
    <tr className={cn(!isActive && 'bg-muted/30')}>
      <td className="px-4 py-3 align-top">
        <div className="capitalize font-medium">{subscription.provider}</div>
        {subscription.providerSubscriptionId && (
          <div className="text-xs text-muted-foreground truncate max-w-[150px]">
            {subscription.providerSubscriptionId}
          </div>
        )}
      </td>
      <td className="px-4 py-3 align-top">
        {subscription.tier ? (
          <span className="text-xs font-semibold capitalize">
            {subscription.tier === 'super' ? 'Super Curio' : 'Ultra Curio'}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3 align-top">
        <span className={cn('text-xs font-semibold uppercase', getStatusColor(subscription.status))}>
          {subscription.status}
        </span>
        {subscription.cancelledAt && (
          <div className="text-xs text-muted-foreground mt-1">
            Cancelled {formatDate(subscription.cancelledAt)}
          </div>
        )}
        {subscription.pausedAt && (
          <div className="text-xs text-muted-foreground mt-1">
            Paused {formatDate(subscription.pausedAt)}
          </div>
        )}
      </td>
      <td className="px-4 py-3 align-top">
        <div className="flex flex-col gap-1 text-xs">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-muted-foreground" />
            <span>{formatDate(subscription.currentPeriodStart)}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <span>to</span>
            <span>{formatDate(subscription.currentPeriodEnd)}</span>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 align-top">
        <div className="flex items-center gap-1 text-xs">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span>{formatDate(subscription.nextBillingDate)}</span>
        </div>
      </td>
      <td className="px-4 py-3 align-top">
        <time className="text-xs text-muted-foreground">
          {formatDate(subscription.createdAt)}
        </time>
      </td>
      <td className="px-4 py-3 align-top text-right">
        <div className="flex justify-end gap-2">
          {isActive && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-9 rounded-lg"
                onClick={() => onPause(subscription.subscriptionId)}
              >
                <Pause className="w-4 h-4 mr-1" />
                Pause
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-9 rounded-lg"
                onClick={() => onCancel(subscription.subscriptionId)}
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            </>
          )}
          {(isPaused || isCancelled) && (
            <Button
              size="sm"
              variant="outline"
              className="h-9 rounded-lg"
              onClick={() => onReactivate(subscription.subscriptionId)}
            >
              <Play className="w-4 h-4 mr-1" />
              Reactivate
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => onDelete(subscription.subscriptionId)}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
        </div>
      </td>
    </tr>
  );
}

