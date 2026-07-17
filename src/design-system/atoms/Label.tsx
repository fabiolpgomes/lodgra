'use client'

import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const labelVariants = cva(
  [
    'block',
    'font-heading font-black text-be-text',
    'uppercase tracking-wider',
    'transition-colors',
  ],
  {
    variants: {
      size: {
        sm: 'text-design-xs',
        md: 'text-design-sm',
        lg: 'text-design-base',
      },
      optional: {
        true: 'after:content-["*"] after:ml-1 after:text-red-600',
      },
    },
    defaultVariants: {
      size: 'md',
      optional: false,
    },
  }
)

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement>,
    VariantProps<typeof labelVariants> {}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, size, optional, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(labelVariants({ size, optional }), className)}
      {...props}
    />
  )
)

Label.displayName = 'Label'

export { Label, labelVariants }
