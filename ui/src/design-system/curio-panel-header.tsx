import * as React from "react"
import { cn } from "@/lib/utils"

export interface CurioPanelHeaderProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const CurioPanelHeader = React.forwardRef<HTMLDivElement, CurioPanelHeaderProps>(
  ({ className, children, ...props }, ref) => {
    // Separate title/subtitle from action
    const titleSubtitle = React.Children.toArray(children).filter(
      (child) => React.isValidElement(child) && 
      (child.type === CurioPanelTitle || child.type === CurioPanelSubtitle)
    );
    const action = React.Children.toArray(children).find(
      (child) => React.isValidElement(child) && child.type === CurioPanelAction
    );

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-between gap-4 w-full",
          className
        )}
        {...props}
      >
        <div className="flex flex-col gap-0 flex-1">
          {titleSubtitle}
        </div>
        {action}
      </div>
    )
  }
)
CurioPanelHeader.displayName = "CurioPanelHeader"

export interface CurioPanelTitleProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const CurioPanelTitle = React.forwardRef<HTMLDivElement, CurioPanelTitleProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "text-foreground text-xl font-semibold leading-7",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
CurioPanelTitle.displayName = "CurioPanelTitle"

export interface CurioPanelSubtitleProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const CurioPanelSubtitle = React.forwardRef<HTMLDivElement, CurioPanelSubtitleProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "text-muted-foreground text-sm leading-5",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
CurioPanelSubtitle.displayName = "CurioPanelSubtitle"

export interface CurioPanelActionProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const CurioPanelAction = React.forwardRef<HTMLDivElement, CurioPanelActionProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-2 shrink-0",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
CurioPanelAction.displayName = "CurioPanelAction"

export { CurioPanelHeader, CurioPanelTitle, CurioPanelSubtitle, CurioPanelAction }
