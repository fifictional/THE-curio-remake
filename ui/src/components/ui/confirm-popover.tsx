'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Button } from './button';
import React, { useCallback, useState } from 'react';

interface ConfirmPopoverProps {
  onConfirm: () => void | Promise<void>;
  children: React.ReactNode; // trigger element (use asChild)
  disabled?: boolean;
  label?: string; // e.g. "Delete"
  confirmLabel?: string; // e.g. "Confirm?"
}

export function ConfirmPopover({ onConfirm, children, disabled = false, label = 'Delete', confirmLabel = 'Confirm?' }: ConfirmPopoverProps) {
  const [open, setOpen] = useState(false);

  const handleConfirm = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Close immediately, then run confirm action
    setOpen(false);
    await onConfirm();
  }, [onConfirm]);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (disabled) return;
    setOpen(nextOpen);
  }, [disabled]);

  return (
    <DropdownMenu.Root open={open} onOpenChange={handleOpenChange}>
      <DropdownMenu.Trigger asChild>
        {/* trigger provided by caller */}
        {children}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-[160px] bg-white rounded-md shadow-lg border border-gray-200 p-2 z-50"
          sideOffset={6}
          align="end"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-gray-700">{confirmLabel}</div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 rounded-md text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-7 px-2 rounded-md bg-red-600 hover:bg-red-700 text-white"
                onClick={handleConfirm}
              >
                {label}
              </Button>
            </div>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}


