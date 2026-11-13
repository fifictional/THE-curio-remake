'use client';

import * as React from "react";
import { cn } from "@/lib/utils";

interface InvisibleTextareaProps extends React.InputHTMLAttributes<HTMLTextAreaElement> {
  wrapperClassName?: string;
}

const InvisibleTextarea = React.forwardRef<HTMLTextAreaElement, InvisibleTextareaProps>(
  ({ className, wrapperClassName, ...props }, ref) => {
    return (
      <div className={cn("relative", wrapperClassName)}>
        <textarea
          ref={ref}
          className={cn(
            "w-full bg-transparent border-0 outline-none focus:ring-0 p-0",
            "border-b-2 border-primary",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

InvisibleTextarea.displayName = "InvisibleTextarea";

export { InvisibleTextarea }; 