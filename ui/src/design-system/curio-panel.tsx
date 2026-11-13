import * as React from "react"
import { cn } from "@/lib/utils"
import { VariantProps, cva } from "class-variance-authority"

const curioPanelVariants = cva(
  // Base styles - rounded-lg (8px)
  "self-stretch relative bg-white rounded-2xl inline-flex flex-col justify-between items-center",
  {
    variants: {
      variant: {
        default: "bg-white",
        ghost: "bg-transparent",
      },
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
      scrollable: {
        true: "h-full overflow-y-auto",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "default",
      border: false,
      scrollable: false,
    },
  }
)

export interface CurioPanelProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof curioPanelVariants> {}

const CurioPanel = React.forwardRef<HTMLDivElement, CurioPanelProps>(
  ({ className, variant, padding, border, scrollable, ...props }, ref) => {
    return (
      <div
        className={cn(curioPanelVariants({ variant, padding, border, scrollable, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
CurioPanel.displayName = "CurioPanel"

export { CurioPanel, curioPanelVariants }
