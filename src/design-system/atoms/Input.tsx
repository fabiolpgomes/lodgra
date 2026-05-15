'use client'

import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const inputVariants = cva(
  [
    'block w-full',
    'px-3 py-2',
    'text-design-base',
    'border border-lodgra-primary/10',
    'rounded-sm',
    'bg-white',
    'placeholder:text-lodgra-primary/30',
    'text-lodgra-primary',
    'transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-lodgra-primary/20 focus:border-lodgra-primary',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-lodgra-bg-light',
  ],
  {
    variants: {
      // Size variants
      size: {
        sm: 'text-design-sm px-2 py-1.5',
        md: 'text-design-base px-3 py-2',
        lg: 'text-design-lg px-4 py-3',
      },
      // State variants
      error: {
        true: 'border-red-500 focus:ring-red-500/20',
      },
    },
    defaultVariants: {
      size: 'md',
      error: false,
    },
  }
)

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string
  helperText?: string
  errorMessage?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      size,
      error,
      label,
      helperText,
      errorMessage,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId()
    const inputId = id || generatedId

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="text-design-sm font-heading font-black text-lodgra-primary uppercase tracking-wider"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(inputVariants({ size, error: error || !!errorMessage }), className)}
          {...props}
        />
        {errorMessage && (
          <p className="text-design-xs text-red-600 font-bold">{errorMessage}</p>
        )}
        {helperText && !errorMessage && (
          <p className="text-design-xs text-lodgra-primary/40">{helperText}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input, inputVariants }
