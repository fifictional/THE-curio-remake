import * as React from "react"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { Trash2 } from "lucide-react"
import { CurioDropdownButton } from "./curio-dropdown-button"
import { CurioDropdownMenuContent } from "./curio-dropdown-menu-content"
import { CurioDropdownContentListItem } from "./curio-dropdown-content-list-item"
import { cn } from "@/lib/utils"

export interface CurioDeleteButtonIconProps {
  onConfirm: () => void
  disabled?: boolean
  confirmText?: string
  className?: string
  testId?: string
}

export const CurioDeleteButtonIcon = React.forwardRef<
  HTMLButtonElement,
  CurioDeleteButtonIconProps
>(({ onConfirm, disabled = false, confirmText = "Confirm?", className, testId }, ref) => {
  const [open, setOpen] = React.useState(false)

  const handleConfirm = React.useCallback(() => {
    onConfirm()
    setOpen(false)
  }, [onConfirm])

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild className="outline-none focus:outline-none">
        <CurioDropdownButton
          ref={ref}
          icon={<Trash2 className="h-4 w-4" />}
          className={cn(
            "text-red-600 hover:text-red-700 hover:bg-red-50",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
          disabled={disabled}
          data-testid={testId}
        />
      </DropdownMenu.Trigger>
      <CurioDropdownMenuContent align="end">
        <CurioDropdownContentListItem
          onClick={handleConfirm}
          disabled={disabled}
          className="text-red-600 hover:bg-red-50"
        >
          {confirmText}
        </CurioDropdownContentListItem>
      </CurioDropdownMenuContent>
    </DropdownMenu.Root>
  )
})

CurioDeleteButtonIcon.displayName = "CurioDeleteButtonIcon"
