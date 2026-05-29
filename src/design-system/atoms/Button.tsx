'use client'

import React from 'react'
import { Button as ShadcnButton, buttonVariants } from '@/components/common/ui/button'
import type { VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Compatibility shim: maps design-system variant names → shadcn variants
type DSVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type DSSize = 'sm' | 'md' | 'lg'

const variantMap: Record<DSVariant, VariantProps<typeof buttonVariants>['variant']> = {
  primary: 'default',
  secondary: 'action',
  ghost: 'ghost',
  danger: 'destructive',
}

const sizeMap: Record<DSSize, VariantProps<typeof buttonVariants>['size']> = {
  sm: 'sm',
  md: 'default',
  lg: 'lg',
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: DSVariant
  size?: DSSize
  isLoading?: boolean
  children: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => (
    <ShadcnButton
      ref={ref}
      variant={variantMap[variant]}
      size={sizeMap[size]}
      disabled={disabled || isLoading}
      className={cn(className)}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          A processar...
        </>
      ) : (
        children
      )}
    </ShadcnButton>
  )
)

Button.displayName = 'Button'

export { Button, buttonVariants }
