import React from 'react'

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
}

export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ children, className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`
        w-full
        max-w-6xl
        mx-auto
        px-4 md:px-6 lg:px-8
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
)

Container.displayName = 'Container'
