import React from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`
        bg-white dark:bg-gray-900
        border border-gray-200 dark:border-gray-700
        rounded-xl
        shadow-md
        p-6
        hover:shadow-lg
        transition-shadow duration-200
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
)

Card.displayName = 'Card'
