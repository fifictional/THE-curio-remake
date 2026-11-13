"use client"

import * as React from "react"
import { CurioSelectMenuItem } from "@/design-system/curio-select-menu-item"
import { cn } from "@/lib/utils"

export interface SelectMenuOption {
  value: string
  label: string
  icon?: React.ReactNode
}

export interface SelectMenuProps {
  title?: string
  options: SelectMenuOption[]
  value?: string
  onValueChange?: (value: string) => void
  className?: string
}

export function SelectMenu({
  title,
  options,
  value,
  onValueChange,
  className,
}: SelectMenuProps) {
  const handleItemClick = (optionValue: string) => {
    onValueChange?.(optionValue)
  }

  return (
    <div className={cn("w-full space-y-3", className)}>
      {title && (
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
      )}
      <div className="space-y-3">
        {options.map((option) => (
          <CurioSelectMenuItem
            key={option.value}
            icon={option.icon}
            selected={value === option.value}
            onClick={() => handleItemClick(option.value)}
          >
            {option.label}
          </CurioSelectMenuItem>
        ))}
      </div>
    </div>
  )
}
