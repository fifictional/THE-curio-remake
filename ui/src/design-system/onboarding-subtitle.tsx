import * as React from "react"
import { cn } from "@/lib/utils"

export interface OnboardingSubtitleProps {
  children: React.ReactNode
  className?: string
}

export function OnboardingSubtitle({ children, className }: OnboardingSubtitleProps) {
  return (
    <p className={cn("self-stretch justify-start text-muted-foreground text-sm font-normal font-['Lexend'] leading-5", className)}>
      {children}
    </p>
  )
}
