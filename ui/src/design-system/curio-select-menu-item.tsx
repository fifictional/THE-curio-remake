import * as React from "react"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

export interface CurioSelectMenuItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode
  children: React.ReactNode
  selected?: boolean
}

const CurioSelectMenuItem = React.forwardRef<HTMLButtonElement, CurioSelectMenuItemProps>(
  ({ className, icon, children, selected = false, ...props }, ref) => {
    return (
      <button
        className={cn(
          "flex items-center gap-3 rounded-md p-2 w-full text-left transition-colors",
          "border cursor-pointer",
          "bg-accent",
          selected
            ? "border-primary"
            : "border-border",
          className
        )}
        ref={ref}
        {...props}
      >
        {/* Left icon */}
        {icon && (
          <div className="shrink-0 text-foreground">
            {icon}
          </div>
        )}
        
        {/* Text content */}
        <span className="flex-1 text-sm font-normal text-foreground">
          {children}
        </span>
        
        {/* Right checkmark icon (only shown when selected) */}
        {selected && (
          <div className="shrink-0 text-foreground">
            <Check className="h-5 w-5" />
          </div>
        )}
      </button>
    )
  }
)
CurioSelectMenuItem.displayName = "CurioSelectMenuItem"

export { CurioSelectMenuItem }
