import * as React from "react"
import { cn } from "@/lib/utils"

export interface OnboardingHeaderProps {
  children: React.ReactNode
  className?: string
}

export function OnboardingHeader({ children, className }: OnboardingHeaderProps) {
  return (
    <div className={cn("self-stretch justify-start text-card-foreground text-3xl font-bold font-['Lexend'] leading-9", className)}>
      {children}
    </div>
  )
}
