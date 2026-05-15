'use client'

import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  // Base styles (all variants)
  [
    'inline-flex items-center justify-center',
    'font-heading font-black text-design-sm',
    'tracking-wider uppercase',
    'rounded-sm',
    'transition-fast',
    'cursor-pointer',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'whitespace-nowrap',
  ],
  {
    variants: {
      // Size variants
      size: {
        sm: 'px-3 py-1.5 text-design-xs',
        md: 'px-4 py-2.5 text-design-sm',
        lg: 'px-6 py-3.5 text-design-base',
      },
      // Color variants
      variant: {
        // Primary: Brand blue background with white text
        primary: [
          'bg-lodgra-primary text-white',
          'hover:bg-opacity-90 active:bg-opacity-80',
          'focus:ring-lodgra-primary/50',
        ],
        // Secondary: Accent yellow background with blue text
        secondary: [
          'bg-lodgra-accent text-lodgra-primary',
          'hover:bg-opacity-90 active:bg-opacity-80',
          'focus:ring-lodgra-accent/50',
        ],
        // Ghost: Transparent with border
        ghost: [
          'border border-lodgra-primary/20 text-lodgra-primary',
          'hover:bg-lodgra-primary/5 active:bg-lodgra-primary/10',
          'focus:ring-lodgra-primary/50',
        ],
        // Danger: Error state (red)
        danger: [
          'bg-red-600 text-white',
          'hover:bg-red-700 active:bg-red-800',
          'focus:ring-red-500/50',
        ],
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'primary',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean
  children: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="inline-block mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          A processar...
        </>
      ) : (
        children
      )}
    </button>
  )
)

Button.displayName = 'Button'

export { Button, buttonVariants }
