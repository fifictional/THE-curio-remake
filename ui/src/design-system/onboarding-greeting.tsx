import * as React from "react"
import { cn } from "@/lib/utils"

export interface OnboardingGreetingProps {
  name?: string
  className?: string
}

export function OnboardingGreeting({ name, className }: OnboardingGreetingProps) {
  const greeting = name ? `${name}, this is great. One more thing:` : "This is great. One more thing:"
  
  return (
    <h1 className={cn("text-3xl font-bold text-gray-900", className)}>
      {greeting}
    </h1>
  )
}
