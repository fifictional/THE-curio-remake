import * as React from "react";
import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CurioListMenuItemProps extends React.HTMLAttributes<HTMLElement> {
  icon: LucideIcon;
  label: string;
  title?: string;

  href?: string;
  onClick?: () => void;

  disabled?: boolean;
  active?: boolean;
  hidden?: boolean;
}

export const CurioListMenuItem = ({
  icon: Icon,
  label,
  href,
  onClick,
  disabled = false,
  active = false,
  hidden = false,
  className,
  ...props
}: CurioListMenuItemProps) => {
  const baseClasses = cn(
    "rounded-lg py-1 pl-3 hover:bg-white text-sm",
    "flex items-center transition-colors cursor-pointer",
    active && "bg-focus",
    disabled && "opacity-40 cursor-not-allowed",
    hidden && "hidden",
    className
  );

  const content = (
    <div
      className="flex w-full items-center gap-2 text-sm transition-colors cursor-pointer"
      title={label}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="truncate text-gray-700">
        {label}
      </span>
    </div>
  );

  // 🔹 LINK
  if (href && !disabled) {
    const { ...linkProps } = props;
    return (
      <Link
        href={href}
        className={baseClasses}
        onClick={() => {
          onClick?.();
        }}
        {...linkProps}
      >
        {content}
      </Link>
    );
  }

  // 🔹 BUTTON
  const { ...buttonProps } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={baseClasses}
      {...buttonProps}
    >
      {content}
    </button>
  );
};
