import * as React from "react"
import { cn } from "@/lib/utils"
import { VariantProps, cva } from "class-variance-authority"

const curioButtonVariants = cva(
  // Base styles - matching Figma design
  "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer px-4 py-2 leading-5",
  {
    variants: {
      variant: {
        default: "",
        outline: "border bg-transparent",
        ghost: "bg-transparent hover:bg-gray-100",
        link: "bg-transparent underline-offset-4 hover:underline p-0",
      },
      color: {
        primary: "",
        secondary: "",
      },
      size: {
        default: "h-auto px-4 py-2 text-sm",
        sm: "h-auto px-3 py-1.5 text-sm",
        lg: "h-auto px-6 py-3 text-base",
        full: "w-full h-auto px-4 py-2 text-sm",
        icon: "h-10 w-10 p-0",
      },
    },
    compoundVariants: [
      // Default variant with primary color
      {
        variant: "default",
        color: "primary",
        class: "bg-primary text-primary-foreground hover:bg-primary/90",
      },
      // Default variant with secondary color
      {
        variant: "default",
        color: "secondary",
        class: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
      },
      // Outline variant with primary color
      {
        variant: "outline",
        color: "primary",
        class: "border-primary text-primary hover:bg-primary/10",
      },
      // Outline variant with secondary color
      {
        variant: "outline",
        color: "secondary",
        class: "border-secondary text-secondary hover:bg-secondary/10",
      },
      // Ghost variant with primary color
      {
        variant: "ghost",
        color: "primary",
        class: "text-primary hover:bg-primary/10",
      },
      // Ghost variant with secondary color
      {
        variant: "ghost",
        color: "secondary",
        class: "text-secondary hover:bg-secondary/10",
      },
      // Link variant with primary color
      {
        variant: "link",
        color: "primary",
        class: "text-primary",
      },
      // Link variant with secondary color
      {
        variant: "link",
        color: "secondary",
        class: "text-secondary",
      },
    ],
    defaultVariants: {
      variant: "default",
      color: "primary",
      size: "default",
    },
  }
)

export interface CurioButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof curioButtonVariants> {
  asChild?: boolean
  color?: "primary" | "secondary"
}

const CurioButton = React.forwardRef<HTMLButtonElement, CurioButtonProps>(
  ({ className, variant, color, size, asChild = false, ...props }, ref) => {
    return (
      <button
        className={cn(curioButtonVariants({ variant, color, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
CurioButton.displayName = "CurioButton"

export { CurioButton, curioButtonVariants }
