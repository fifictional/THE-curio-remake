'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useState } from 'react';
import YouTube from 'react-youtube';

interface YoutubeModalProps {
    youtubeVideoUuid: string;
    trigger?: React.ReactNode;
}

export const YoutubeModal = ({ youtubeVideoUuid, trigger }: YoutubeModalProps) => {
    const [open, setOpen] = useState(false);

    return (
        <Dialog.Root open={open} onOpenChange={setOpen}>
            {/* Trigger Button */}
            {trigger ? (
                <Dialog.Trigger asChild>
                    {trigger}
                </Dialog.Trigger>
            ) : (
                <Dialog.Trigger asChild>
                    <button className="rounded-md bg-blue-600 text-white px-4 py-2 hover:bg-blue-700 transition">
                        Watch Video
                    </button>
                </Dialog.Trigger>
            )}

            {/* Portal with Overlay and Content */}
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 animate-fadeIn" />

                <Dialog.Content
                    className="fixed z-50 top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] 
                     w-[90vw] max-w-3xl rounded-2xl bg-white p-4 shadow-xl focus:outline-none"
                >
                    {/* Close Button */}
                    <Dialog.Close asChild>
                        <button
                            className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 transition"
                            aria-label="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </Dialog.Close>

                    {/* Video Viewer */}
                    <div className="rounded-lg overflow-hidden">
                        <div className="flex items-center justify-center h-full w-full">
                            <div className="w-full max-w-full aspect-video">
                                <YouTube
                                    videoId={youtubeVideoUuid}
                                    className="w-full h-full"
                                    opts={{
                                        width: '100%',
                                        height: '100%',
                                        playerVars: {
                                            rel: 0,
                                            modestbranding: 1,
                                        },
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
