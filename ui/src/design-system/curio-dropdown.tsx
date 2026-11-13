import * as React from "react"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { CurioDropdownButton } from "./curio-dropdown-button"
import { CurioDropdownMenuContent } from "./curio-dropdown-menu-content"

export interface CurioDropdownProps {
  icon?: React.ReactNode
  children?: React.ReactNode
  showChevron?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'right' | 'bottom' | 'left'
  sideOffset?: number
}

export function CurioDropdown({
  icon,
  children,
  showChevron,
  open,
  onOpenChange,
  align = 'end',
  side = 'bottom',
  sideOffset = 5,
}: CurioDropdownProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen
  const handleOpenChange = isControlled ? onOpenChange : setInternalOpen

  // Separate trigger text (string/number) from menu items (React elements)
  const childrenArray = React.Children.toArray(children)
  const triggerText = childrenArray.find(
    (child) => typeof child === 'string' || typeof child === 'number'
  )
  const menuItems = childrenArray.filter(
    (child) => React.isValidElement(child)
  )

  // Wrap menu items to auto-close on click
  const wrappedMenuItems = React.Children.map(menuItems, (child) => {
    if (React.isValidElement(child)) {
      // Check if this is a delete item (has onDelete prop)
      const isDeleteItem = !!child.props.onDelete
      
      if (isDeleteItem) {
        // For delete items, don't wrap the onDelete - let the delete item handle it internally
        // We need to track when the delete is actually confirmed to close the menu
        // The delete item will call onDelete only on the second click (confirmation)
        const originalOnDelete = child.props.onDelete
        return React.cloneElement(child as React.ReactElement<any>, {
          onDelete: () => {
            // Call the original onDelete (which will be called only on confirmation)
            originalOnDelete?.()
            // Close menu after delete is confirmed
            handleOpenChange?.(false)
          },
        })
      } else {
        // For regular items, close menu after click
        return React.cloneElement(child as React.ReactElement<any>, {
          onClick: (...args: any[]) => {
            // Call original onClick if it exists
            if (child.props.onClick) {
              child.props.onClick(...args)
            }
            // Close menu after click
            handleOpenChange?.(false)
          },
        })
      }
    }
    return child
  })

  return (
    <DropdownMenu.Root open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenu.Trigger asChild className="outline-none focus:outline-none">
        <CurioDropdownButton
          icon={icon}
          showChevron={showChevron}
        >
          {triggerText}
        </CurioDropdownButton>
      </DropdownMenu.Trigger>
      <CurioDropdownMenuContent align={align} side={side} sideOffset={sideOffset}>
        {wrappedMenuItems}
      </CurioDropdownMenuContent>
    </DropdownMenu.Root>
  )
}

// Re-export individual components for advanced usage
export {
  CurioDropdownButton,
  CurioDropdownMenuContent,
}
