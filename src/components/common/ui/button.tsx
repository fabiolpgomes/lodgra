import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        // ========== Behance Design System Variants ==========
        "be-primary": "shadow-none rounded-full font-600 transition-all",
        "be-secondary": "shadow-none rounded-full font-600 transition-all",
        "be-tertiary": "shadow-none rounded-full font-600 transition-all",
        "be-ghost": "shadow-none rounded-full font-600 transition-all",
        "be-contrast": "shadow-none rounded-full font-600 transition-all",

        // ========== Existing Variants ==========
        default: "bg-primary text-white hover:bg-primary/90 shadow-none",
        action: "bg-be-blue text-lodgra-blue font-semibold hover:bg-be-blue/90 shadow-none",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 shadow-none",
        outline:
          "border bg-background shadow-none hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-none",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 shadow-none",
        link: "text-primary underline-offset-4 hover:underline shadow-none",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        // ========== Behance pill sizes ==========
        "be-sm": "h-7 px-4 py-1.5 text-xs",
        "be-md": "h-8 px-5 py-2 text-sm",
        "be-lg": "h-10 px-6 py-2.5 text-base",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  style = {},
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  const getBehanceStyle = (v: string) => {
    const baseStyle: React.CSSProperties = {
      backgroundColor: 'var(--be-surface)',
      color: 'var(--be-text)',
      borderColor: 'var(--be-border)',
    }

    switch (v) {
      case 'be-primary':
        return {
          backgroundColor: 'var(--be-blue)',
          color: 'white',
          ...baseStyle,
        }
      case 'be-secondary':
        return {
          backgroundColor: 'var(--be-surface)',
          color: 'var(--be-text)',
          border: '1px solid var(--be-border)',
          ...baseStyle,
        }
      case 'be-tertiary':
        return {
          backgroundColor: 'var(--be-blue-light)',
          color: 'var(--be-blue)',
          border: '1px solid var(--be-blue-pale)',
          ...baseStyle,
        }
      case 'be-ghost':
        return {
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          color: 'white',
          ...baseStyle,
        }
      case 'be-contrast':
        return {
          backgroundColor: 'var(--be-text)',
          color: 'white',
          ...baseStyle,
        }
      default:
        return baseStyle
    }
  }

  const isBehance = variant && typeof variant === 'string' && variant.startsWith('be-')
  const finalStyle = isBehance && variant ? { ...getBehanceStyle(variant), ...style } : style

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      style={finalStyle}
      {...props}
    />
  )
}

export { Button, buttonVariants }
