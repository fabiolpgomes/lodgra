import React from 'react'
import Image from 'next/image'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'light' | 'dark'
  className?: string
}

const sizes = {
  sm: { height: 32, width: 36 },
  md: { height: 40, width: 45 },
  lg: { height: 48, width: 54 },
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', className = '' }) => {
  const { height, width } = sizes[size]

  return (
    <div className={`relative ${className}`}>
      <Image
        src="/brand/lodgra-logo-vertical.png"
        alt="Lodgra"
        height={height}
        width={width}
        className="object-contain"
        priority
      />
    </div>
  )
}
