'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useState } from 'react';
import { SadCat } from '../custom-icons/sad-cat';

export const CancelSubscriptionModal = ({
    trigger,
    onConfirm
}: {
    trigger?: React.ReactNode;
    onConfirm: (reason?: string) => void
}) => {
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState('');

    return (
        <Dialog.Root open={open} onOpenChange={setOpen}>
            {/* Trigger */}
            {trigger ? (
                <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
            ) : (
                <Dialog.Trigger asChild>
                    <button className="rounded-md bg-red-600 text-white px-4 py-2 hover:bg-red-700 transition">
                        Cancel Subscription
                    </button>
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
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </Dialog.Close>

                    {/* Title */}
                    <h2 className="text-xl font-semibold text-gray-800">
                        Cancel Subscription
                    </h2>

                    {/* Subtitle Row */}
                    <div className="mt-1 flex items-start justify-between gap-4">
                        <p className="text-gray-600 leading-relaxed">
                            We are sad to see you go! <br />
                            <br />
                            Before you go, please tell us why you are cancelling? <br />
                            Your honest feedback will help us improve.
                        </p>

                        <SadCat className="w-20 h-20 shrink-0" />
                    </div>

                    {/* Textarea */}
                    <textarea
                        rows={4}
                        placeholder="Tell us your reason here...."
                        className="
              mt-4 w-full border border-gray-300 rounded-lg p-3 
              focus:ring-2 focus:ring-red-300 focus:outline-none
              resize-none text-gray-700
            "
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                    />

                    {/* Buttons */}
                    <div className="mt-6 flex justify-end gap-3">
                        <Dialog.Close asChild>
                            <button className="px-5 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 transition hover:cursor-pointer">
                                Go back
                            </button>
                        </Dialog.Close>

                        <button
                            className="
                px-5 py-2 rounded-md bg-red-600 text-white 
                hover:bg-red-700 transition disabled:opacity-50
                hover:cursor-pointer
              "
                            disabled={false} // change to !reason if reason should be required
                            onClick={() => {
                                onConfirm(reason)
                                setOpen(false);
                            }}
                        >
                            Confirm Cancellation
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
