import * as React from "react"
import { cn } from "@/lib/utils"

export interface CurioPanelContentProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const CurioPanelContent = React.forwardRef<HTMLDivElement, CurioPanelContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('pt-6', className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
CurioPanelContent.displayName = "CurioPanelContent"

export { CurioPanelContent }
