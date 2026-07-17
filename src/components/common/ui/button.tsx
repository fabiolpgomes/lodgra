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
        "be-primary": "bg-be-blue text-white hover:bg-be-blue-hover active:bg-be-blue-active shadow-none rounded-full font-adobe-clean font-600",
        "be-secondary": "bg-white text-be-text border border-be-border hover:bg-be-surface shadow-none rounded-full font-adobe-clean font-600",
        "be-tertiary": "bg-be-blue-light text-be-blue border border-be-blue-pale hover:bg-be-blue-pale shadow-none rounded-full font-adobe-clean font-600",
        "be-ghost": "bg-black/65 text-white hover:bg-black/80 shadow-none rounded-full font-adobe-clean font-600",
        "be-contrast": "bg-be-text text-white hover:bg-be-grey-700 shadow-none rounded-full font-adobe-clean font-600",

        // ========== Existing Variants ==========
        default: "bg-primary text-white hover:bg-primary/90 shadow-none",
        action: "bg-lodgra-accent text-lodgra-blue font-semibold hover:bg-lodgra-accent/90 shadow-none",
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
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
