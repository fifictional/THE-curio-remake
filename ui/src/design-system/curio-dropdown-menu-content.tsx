import * as React from "react"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { cn } from "@/lib/utils"

export interface CurioDropdownMenuContentProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenu.Content> {
  children: React.ReactNode
}

const CurioDropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenu.Content>,
  CurioDropdownMenuContentProps
>(({ className, children, sideOffset = 5, ...props }, ref) => {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        ref={ref}
        className={cn(
          "min-w-[160px] bg-white rounded-lg shadow-lg border border-gray-200 p-1 z-50",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
          "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        sideOffset={sideOffset}
        {...props}
      >
        {children}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  )
})
CurioDropdownMenuContent.displayName = "CurioDropdownMenuContent"

export { CurioDropdownMenuContent }
