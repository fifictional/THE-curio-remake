'use client';

import { Dialog, VisuallyHidden } from '@radix-ui/themes';
import { AlertCircle } from 'lucide-react';

interface RateLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RateLimitModal({ open, onOpenChange }: RateLimitModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <VisuallyHidden>
        <Dialog.Title>Daily Limit Reached</Dialog.Title>
      </VisuallyHidden>
      <Dialog.Content 
        aria-describedby='rate-limit-modal' 
        style={{ maxWidth: '500px' } as React.CSSProperties}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <AlertCircle className="w-6 h-6 text-yellow-500" />
            <h3 className="text-lg font-medium text-headers">
              Daily Limit Reached
            </h3>
          </div>

          {/* Content */}
          <div className="space-y-4">
            <p className="text-gray-600">
              You've reached your daily limit for AI requests. This limit helps us ensure fair usage and maintain service quality for all users.
            </p>
            <p className="text-sm font-medium text-gray-700">
              Your limit will reset at midnight UTC.
            </p>
          </div>

          {/* Footer */}
          <div className="mt-8 flex justify-end">
            <button
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}