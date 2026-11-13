import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { SquareArrowOutUpRight } from "lucide-react";

export interface CurioSidebarSectionProps
  extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  isSidebarOpen: boolean;
  rightLink?: {
    label: string;
    href: string;
  };
  children: React.ReactNode;
}

export const CurioSidebarSection = ({
  title,
  isSidebarOpen,
  rightLink,
  children,
  className,
  ...props
}: CurioSidebarSectionProps) => {
  if (!isSidebarOpen) return null;

  return (
    <div className={cn("flex flex-col text-gray-500", className)} {...props}>
      <div className="flex items-baseline justify-between">
        <span className="text-lg font-medium">{title}</span>

        {rightLink && (
          <Link
            href={rightLink.href}
            className="text-xs italic underline text-gray-500 flex items-center gap-1"
          >
            {rightLink.label}
            <SquareArrowOutUpRight className="w-3 h-3" />
          </Link>
        )}
      </div>

      <div className="flex flex-col w-full mt-2 h-full overflow-y-hidden">
        {children}
      </div>
    </div>
  );
};
