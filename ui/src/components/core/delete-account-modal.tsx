'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export const DeleteAccountModal = ({
  trigger,
  onConfirm
}: {
  trigger?: React.ReactNode;
  onConfirm: (reason: string) => Promise<void>;
}) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!reason.trim()) {
      return;
    }

    setError(null);
    setIsDeleting(true);
    try {
      await onConfirm(reason);
      setOpen(false);
      setReason('');
    } catch (error) {
      console.error('Error deleting account:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset state when modal closes
      setReason('');
      setError(null);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      {/* Trigger */}
      {trigger ? (
        <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      ) : (
        <Dialog.Trigger asChild>
          <Button variant="outline" className="border-red-500 text-red-500 hover:bg-red-500">
            Delete Account
          </Button>
        </Dialog.Trigger>
      )}

      {/* Popup */}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fadeIn" />

        <Dialog.Content
          className="
            fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
            w-[90vw] max-w-lg rounded-2xl bg-white p-6 shadow-xl
            focus:outline-none
          "
        >
          {/* Close Button */}
          <Dialog.Close asChild>
            <button
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition hover:cursor-pointer"
              aria-label="Close"
              disabled={isDeleting}
            >
              <X className="w-5 h-5" />
            </button>
          </Dialog.Close>

          {/* Warning Icon */}
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <h2 className="text-xl font-semibold text-red-500">
              Delete Account
            </h2>
          </div>

          {/* Warning Message */}
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-500 font-medium mb-2">
              Warning: This action cannot be undone
            </p>
            <p className="text-sm text-gray-700">
              All your documents and data will be deleted and will not be possible to restore them.
            </p>
          </div>

          {/* Confirmation Question */}
          <p className="text-base text-gray-800 font-medium mb-4">
            Are you sure?
          </p>

          {/* Subtitle */}
          <p className="text-sm text-gray-600 mb-4">
            Please tell us why you are deleting your account. Your feedback helps us improve.
          </p>

          {/* Textarea */}
          <Textarea
            rows={4}
            placeholder="Tell us your reason here..."
            className="mb-4 min-h-20 rounded-lg resize-none"
            value={reason}

            onChange={(e) => setReason(e.target.value)}
            disabled={isDeleting}
          />

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3">
            <Dialog.Close asChild>
              <Button
                variant="outline"
                disabled={isDeleting}
              >
                Cancel
              </Button>
            </Dialog.Close>

            <Button
              variant="outline"
              className="border-red-500 text-red-500 hover:bg-red-500"
              onClick={handleConfirm}
              disabled={!reason.trim() || isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Confirm Deletion'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

