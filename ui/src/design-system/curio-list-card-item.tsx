import * as React from "react"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"
import { VariantProps, cva } from "class-variance-authority"

const curioListCardItemVariants = cva(
  "relative bg-white rounded-2xl flex items-center gap-4 w-full",
  {
    variants: {
      padding: {
        default: "p-6",
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
        none: "p-0",
      },
      border: {
        true: "border border-border",
        false: "",
      },
    },
    defaultVariants: {
      padding: "md",
      border: true,
    },
  }
)

export interface CurioListCardItemProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof curioListCardItemVariants> {}

const CurioListCardItem = React.forwardRef<HTMLDivElement, CurioListCardItemProps>(
  ({ className, padding, border, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(curioListCardItemVariants({ padding, border }), className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
CurioListCardItem.displayName = "CurioListCardItem"

export interface CurioListCardItemIconProps
  extends React.HTMLAttributes<HTMLDivElement> {
  icon: LucideIcon
}

const CurioListCardItemIcon = React.forwardRef<HTMLDivElement, CurioListCardItemIconProps>(
  ({ className, icon: Icon, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-center shrink-0",
          className
        )}
        {...props}
      >
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
    )
  }
)
CurioListCardItemIcon.displayName = "CurioListCardItemIcon"

export interface CurioListCardItemHeaderProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const CurioListCardItemHeader = React.forwardRef<HTMLDivElement, CurioListCardItemHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col gap-0 flex-1 min-w-0",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
CurioListCardItemHeader.displayName = "CurioListCardItemHeader"

export interface CurioListCardItemTitleProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const CurioListCardItemTitle = React.forwardRef<HTMLDivElement, CurioListCardItemTitleProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "text-foreground text-base font-semibold leading-6",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
CurioListCardItemTitle.displayName = "CurioListCardItemTitle"

export interface CurioListCardItemSubtitleProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const CurioListCardItemSubtitle = React.forwardRef<HTMLDivElement, CurioListCardItemSubtitleProps>(
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
CurioListCardItemSubtitle.displayName = "CurioListCardItemSubtitle"

export interface CurioListCardItemActionProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const CurioListCardItemAction = React.forwardRef<HTMLDivElement, CurioListCardItemActionProps>(
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
CurioListCardItemAction.displayName = "CurioListCardItemAction"

export { 
  CurioListCardItem, 
  CurioListCardItemIcon,
  CurioListCardItemHeader, 
  CurioListCardItemTitle, 
  CurioListCardItemSubtitle, 
  CurioListCardItemAction 
}
