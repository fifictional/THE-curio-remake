import * as React from "react"
import { cn } from "@/lib/utils"

export interface AccessDeniedProps
  extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  message?: string
}

const AccessDenied = React.forwardRef<HTMLDivElement, AccessDeniedProps>(
  ({ className, title = "Access Denied", message = "You don't have access to this resource.", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-center h-screen",
          className
        )}
        {...props}
      >
        <div className="text-center p-6">
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            {title}
          </h1>
          <p className="text-muted-foreground">
            {message}
          </p>
        </div>
      </div>
    )
  }
)
AccessDenied.displayName = "AccessDenied"

export { AccessDenied }
