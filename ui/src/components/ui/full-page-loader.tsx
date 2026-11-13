import React from "react";
import { Loader2 } from "lucide-react";

interface FullPageLoaderProps {
    /** Main message shown under the spinner (defaults to "Loading...") */
    message?: string;
    /** Optional smaller subtitle under the main message */
    subtitle?: string;
    /** Whether the loader should cover the whole viewport (default true). If false, it will center inside its container. */
    fullPage?: boolean;
    /** Size of the lucide icon in px */
    size?: number;
}

export default function FullPageLoader({
    message = "Loading...",
    subtitle,
    fullPage = true,
    size = 48,
}: FullPageLoaderProps) {
    const containerClasses = fullPage
        ? "fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        : "flex items-center justify-center w-full h-full";

    return (
        <div className={containerClasses} role="status" aria-live="polite">
            <div className="flex flex-col items-center gap-4 p-6 rounded-2xl shadow-2xl bg-white/95 dark:bg-slate-900/85">
                <Loader2 className="animate-spin" size={size} aria-hidden />

                <div className="text-center">
                    <p className="text-lg font-medium text-slate-900 dark:text-slate-100">{message}</p>
                    {subtitle && (
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
                    )}
                </div>
            </div>
        </div>
    );
}