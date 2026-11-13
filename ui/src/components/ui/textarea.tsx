import * as React from "react"
import TextareaAutosize, { TextareaAutosizeProps } from 'react-textarea-autosize';

import { cn } from "@/lib/utils"

export interface TextareaProps extends TextareaAutosizeProps {
  error?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <TextareaAutosize
        className={cn(
          "flex h-11 w-full rounded-3xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 ring-offset-white placeholder:text-gray-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea } 