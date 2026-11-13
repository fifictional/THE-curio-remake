import * as React from "react"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { cn } from "@/lib/utils"
import { Trash2 } from "lucide-react"

export interface CurioDropdownContentDeleteListItemProps
  extends Omit<React.ComponentPropsWithoutRef<typeof DropdownMenu.Item>, 'onClick'> {
  onDelete: () => void
  disabled?: boolean
  confirmText?: string
  deleteText?: string
}

const CurioDropdownContentDeleteListItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenu.Item>,
  CurioDropdownContentDeleteListItemProps
>(({ className, onDelete, disabled, confirmText = "Confirm?", deleteText = "Delete", ...props }, ref) => {
  const [showConfirm, setShowConfirm] = React.useState(false)

  const handleClick = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (disabled) return
    
    if (showConfirm) {
      // Second click - actually delete
      onDelete()
      setShowConfirm(false)
      // Don't prevent default here - let the menu close
    } else {
      // First click - show confirm, prevent menu from closing
      e.preventDefault()
      e.stopPropagation()
      setShowConfirm(true)
    }
  }, [onDelete, showConfirm, disabled])

  // Prevent Radix from closing the menu on first click (when showing confirm)
  const handleSelect = React.useCallback((e: Event) => {
    if (!showConfirm && !disabled) {
      e.preventDefault()
    }
  }, [showConfirm, disabled])

  // Reset confirmation when disabled or when item loses focus
  React.useEffect(() => {
    if (disabled) {
      setShowConfirm(false)
    }
  }, [disabled])

  return (
    <DropdownMenu.Item
      ref={ref}
      className={cn(
        "relative overflow-hidden flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md",
        "cursor-pointer outline-none transition-all duration-200",
        "text-red-600 hover:bg-red-50",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      disabled={disabled}
      onClick={handleClick}
      onSelect={handleSelect}
      {...props}
    >
      {/* Delete state */}
      <div className={cn(
        "flex items-center gap-2 transition-transform duration-200",
        showConfirm ? "transform -translate-x-full" : "transform translate-x-0"
      )}>
        <Trash2 className="h-4 w-4 shrink-0" />
        <span>{deleteText}</span>
      </div>
      
      {/* Confirm state */}
      <div className={cn(
        "absolute inset-0 flex items-center justify-center",
        "bg-red-500 text-white hover:bg-red-600",
        "transition-transform duration-200",
        showConfirm ? "transform translate-x-0" : "transform translate-x-full"
      )}>
        {confirmText}
      </div>
    </DropdownMenu.Item>
  )
})
CurioDropdownContentDeleteListItem.displayName = "CurioDropdownContentDeleteListItem"

export { CurioDropdownContentDeleteListItem }
