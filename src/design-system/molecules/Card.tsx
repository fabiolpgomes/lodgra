'use client'

import React from 'react'
import { cn } from '@/lib/utils'

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode
  subtitle?: React.ReactNode
  footer?: React.ReactNode
  variant?: 'default' | 'elevated' | 'outlined'
  padding?: 'sm' | 'md' | 'lg'
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ title, subtitle, footer, variant = 'default', padding = 'md', className, children, ...props }, ref) => {
    const variants = {
      default: 'bg-white border border-be-border/10 rounded-sm',
      elevated: 'bg-white shadow-md rounded-sm',
      outlined: 'bg-lodgra-bg-light border-2 border-be-border/20 rounded-sm',
    }

    const paddingClasses = {
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    }

    return (
      <div ref={ref} className={cn(variants[variant], paddingClasses[padding], className)} {...props}>
        {title && (
          <div className="mb-3">
            <h3 className="text-design-base font-heading font-black text-be-text uppercase tracking-wider">
              {title}
            </h3>
            {subtitle && <p className="text-design-sm text-be-text/60 mt-1">{subtitle}</p>}
          </div>
        )}
        <div className="flex flex-col gap-2">{children}</div>
        {footer && <div className="mt-4 border-t border-be-border/10 pt-4">{footer}</div>}
      </div>
    )
  }
)

Card.displayName = 'Card'

export { Card }
