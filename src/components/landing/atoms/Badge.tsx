import React from 'react'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode
  variant?: 'primary' | 'success' | 'warning'
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ children, variant = 'primary', className = '', ...props }, ref) => {
    const variants = {
      primary: 'bg-lodgra-light text-lodgra-primary',
      success: 'bg-lodgra-light text-lodgra-primary',
      warning: 'bg-yellow-100 text-lodgra-gold',
    }

    return (
      <span
        ref={ref}
        className={`
          inline-block
          px-3 py-1
          text-sm font-medium
          rounded-full
          ${variants[variant]}
          ${className}
        `}
        {...props}
      >
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'
