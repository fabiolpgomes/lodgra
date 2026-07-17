import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium tracking-normal transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/20 focus-visible:ring-[3px] focus-visible:ring-[2px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        // ========== Lodgra Premium / Airbnb-inspired Variants ==========
        "be-primary": "shadow-none rounded-sm font-medium transition-all",
        "be-secondary": "shadow-none rounded-sm font-medium transition-all",
        "be-tertiary": "shadow-none rounded-full font-medium transition-all",
        "be-ghost": "shadow-none rounded-full font-medium transition-all",
        "be-contrast": "shadow-none rounded-sm font-medium transition-all",

        // ========== Existing Variants ==========
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-none",
        action: "bg-be-blue text-white font-medium hover:bg-be-blue-hover shadow-none",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 shadow-none",
        outline:
          "border border-border bg-background shadow-none hover:bg-muted hover:text-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-none",
        ghost:
          "hover:bg-muted hover:text-foreground dark:hover:bg-accent/50 shadow-none",
        link: "text-primary underline-offset-4 hover:underline shadow-none",
      },
      size: {
        default: "h-9 px-4 py-2 h-12 px-6 py-3 has-[>svg]:px-4",
        xs: "h-7 gap-1 rounded-sm px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 px-3 h-9 rounded-sm gap-1.5 px-4 has-[>svg]:px-3",
        lg: "h-12 rounded-sm px-7 has-[>svg]:px-5",
        // ========== Lodgra Premium sizes ==========
        "be-sm": "h-9 px-4 py-2 text-sm",
        "be-md": "h-12 px-6 py-3 text-base",
        "be-lg": "h-12 px-7 py-3 text-base",
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

  const getLodgraPremiumStyle = (v: string) => {
    const baseStyle: React.CSSProperties = {
      backgroundColor: 'var(--be-surface)',
      color: 'var(--be-text)',
      borderColor: 'var(--be-border)',
    }

    switch (v) {
      case 'be-primary':
        return {
          ...baseStyle,
          backgroundColor: 'var(--be-blue)',
          color: 'white',
        }
      case 'be-secondary':
        return {
          ...baseStyle,
          backgroundColor: 'var(--be-surface)',
          color: 'var(--be-text)',
          border: '1px solid var(--be-border)',
        }
      case 'be-tertiary':
        return {
          ...baseStyle,
          backgroundColor: 'rgba(201, 162, 39, 0.16)',
          color: '#10203E',
          border: '1px solid rgba(201, 162, 39, 0.32)',
        }
      case 'be-ghost':
        return {
          ...baseStyle,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          color: 'white',
        }
      case 'be-contrast':
        return {
          ...baseStyle,
          backgroundColor: 'var(--be-text)',
          color: 'white',
        }
      default:
        return baseStyle
    }
  }

  const isLegacyDesignAlias = variant && typeof variant === 'string' && variant.startsWith('be-')
  const finalStyle = isLegacyDesignAlias && variant ? { ...getLodgraPremiumStyle(variant), ...style } : style

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
