'use client';

import * as React from "react";
import { cn } from "@/lib/utils";

interface InvisibleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  wrapperClassName?: string;
  multiline?: boolean;
}

const InvisibleInput = React.forwardRef<HTMLInputElement, InvisibleInputProps>(
  ({ className, wrapperClassName, multiline, ...props }, ref) => {
    return (
      <div className={cn("relative", wrapperClassName)}>
        <input
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

InvisibleInput.displayName = "InvisibleInput";

export { InvisibleInput }; 