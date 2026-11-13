import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";


interface CurioListMenuActionButtonProps {
    label: string;
    icon: LucideIcon;
    active?: boolean;
    disabled?: boolean;
    href?: string;
    onClick?: () => void;
}

export const CurioListMenuActionButton = ({
    label,
    icon: Icon,
    active = false,
    disabled = false,
    href,
    onClick,
}: CurioListMenuActionButtonProps) => {
    const baseClass = cn(
        "flex md:flex-row items-center justify-center gap-1 md:gap-2 px-4 py-3 md:px-3 md:py-2 rounded-full transition-all",
        disabled
            ? "cursor-not-allowed opacity-40"
            : active
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:bg-slate-100"
    );

    // 🔹 Disabled always renders as button
    if (disabled) {
        return (
            <button type="button" disabled className={baseClass}>
                <Icon className="h-5 w-5" />
                <span>{label}</span>
            </button>
        );
    }

    // 🔹 Link rendering
    if (href) {
        return (
            <Link href={href} className={baseClass} onClick={onClick}>
                <Icon className="h-5 w-5" />
                <span>{label}</span>
            </Link>
        );
    }

    // 🔹 Default button
    return (
        <button type="button" onClick={onClick} className={baseClass}>
            <Icon className="h-5 w-5" />
            <span>{label}</span>
        </button>
    );
};
