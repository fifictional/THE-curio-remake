import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"

export interface CurioDropdownButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode
  children?: React.ReactNode
  showChevron?: boolean
}

const CurioDropdownButton = React.forwardRef<HTMLButtonElement, CurioDropdownButtonProps>(
  ({ className, icon, children, showChevron = false, ...props }, ref) => {
    const isIconOnly = icon && !children
    const hasText = !!children

    return (
      <button
        className={cn(
          "inline-flex items-center justify-center gap-2 text-sm font-medium transition-colors",
          "outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0",
          "disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
          "bg-transparent hover:bg-gray-100 text-gray-700",
          // Icon-only: full rounded, fixed size, ensure square
          isIconOnly && "rounded-full h-8 w-8 min-w-8 p-0 shrink-0",
          // With text: rounded-lg, auto width, padding
          hasText && "rounded-lg h-auto px-3 py-1.5 w-auto",
          className
        )}
        ref={ref}
        {...props}
      >
        {icon && (
          <span className="shrink-0 flex items-center justify-center">
            {icon}
          </span>
        )}
        {children && (
          <span className="text-sm font-medium">
            {children}
          </span>
        )}
        {showChevron && (
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
        )}
      </button>
    )
  }
)
CurioDropdownButton.displayName = "CurioDropdownButton"

export { CurioDropdownButton }
