import * as React from "react"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { cn } from "@/lib/utils"

export interface CurioDropdownContentListItemProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenu.Item> {
  icon?: React.ReactNode
  children: React.ReactNode
  disabled?: boolean
}

const CurioDropdownContentListItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenu.Item>,
  CurioDropdownContentListItemProps
>(({ className, icon, children, disabled, ...props }, ref) => {
  return (
    <DropdownMenu.Item
      ref={ref}
      className={cn(
        "flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700",
        "hover:bg-gray-100 rounded-md cursor-pointer outline-none",
        "transition-colors",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      disabled={disabled}
      {...props}
    >
      {icon && (
        <span className="shrink-0 flex items-center justify-center h-4 w-4">
          {icon}
        </span>
      )}
      <span className="flex-1">{children}</span>
    </DropdownMenu.Item>
  )
})
CurioDropdownContentListItem.displayName = "CurioDropdownContentListItem"

export { CurioDropdownContentListItem }
