import * as React from "react"
import { cn } from "@/lib/utils"

export interface PricingHeaderProps {
  children: React.ReactNode
  className?: string
}

export function PricingHeader({ children, className }: PricingHeaderProps) {
  return (
    <div className={cn("self-stretch text-center text-card-foreground text-3xl font-bold font-roca-bold leading-9", className)}>
      {children}
    </div>
  )
}
