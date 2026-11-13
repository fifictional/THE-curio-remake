import * as React from "react"
import { cn } from "@/lib/utils"
import { CurioPanel } from "./curio-panel"

export interface TwoPanelLayoutProps {
  leftPanel: React.ReactNode
  rightPanel: React.ReactNode
  ghostPanel?: 'left' | 'right' | 'none'
  leftPanelScrollable?: boolean
  rightPanelScrollable?: boolean
  className?: string
}

export function TwoPanelLayout({
  leftPanel,
  rightPanel,
  ghostPanel = 'none',
  leftPanelScrollable = false,
  rightPanelScrollable = false,
  className,
}: TwoPanelLayoutProps) {
  return (
    <div className={cn("flex w-full h-full bg-deep-focus p-6", className)}>
      {/* Left Panel */}
      <div className="flex flex-col items-center justify-center flex-1 h-full w-1/2">
        <CurioPanel 
          variant={ghostPanel === 'left' ? 'ghost' : 'default'}
          scrollable={leftPanelScrollable}
          className="h-full"
        >
          {leftPanel}
        </CurioPanel>
      </div>

      {/* Right Panel */}
      <div className="relative hidden md:block flex-1 w-1/2 h-full">
        <CurioPanel 
          variant={ghostPanel === 'right' ? 'ghost' : 'default'}
          scrollable={rightPanelScrollable}
          className="h-full w-full"
        >
          {rightPanel}
        </CurioPanel>
      </div>
    </div>
  )
}
