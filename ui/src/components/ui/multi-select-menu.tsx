"use client"

import * as React from "react"
import { CurioSelectMenuItem } from "@/design-system/curio-select-menu-item"
import { cn } from "@/lib/utils"

export interface MultiSelectMenuOption {
  value: string
  label: string
  icon?: React.ReactNode
}

export interface MultiSelectMenuProps {
  title?: string
  options: MultiSelectMenuOption[]
  values?: string[]
  onValuesChange?: (values: string[]) => void
  className?: string
}

export function MultiSelectMenu({
  title,
  options,
  values = [],
  onValuesChange,
  className,
}: MultiSelectMenuProps) {
  const handleItemClick = (optionValue: string) => {
    const newValues = values.includes(optionValue)
      ? values.filter(v => v !== optionValue)
      : [...values, optionValue]
    onValuesChange?.(newValues)
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
            selected={values.includes(option.value)}
            onClick={() => handleItemClick(option.value)}
          >
            {option.label}
          </CurioSelectMenuItem>
        ))}
      </div>
    </div>
  )
}
