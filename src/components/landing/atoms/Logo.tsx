import React from 'react'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'light' | 'dark'
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', variant = 'dark' }) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  }

  const sizeMap = {
    sm: 48,
    md: 48,
    lg: 48,
  }

  const viewSize = sizeMap[size]

  return (
    <svg
      className={`${sizes[size]} inline-block`}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* House base - Verde Primário (#1D9E75) */}
      <rect x="4" y="20" width="40" height="24" rx="4" fill="#1D9E75" />

      {/* Roof - Verde Escuro (#0F6E56) */}
      <path d="M 24 4 L 44 20 L 4 20 Z" fill="#0F6E56" />

      {/* Door - Verde muito escuro (#085041) */}
      <rect x="18" y="30" width="12" height="14" rx="2" fill="#085041" />

      {/* Star background circle - Amarelo claro com opacidade */}
      <circle cx="36" cy="14" r="5" fill="#FAC775" opacity="0.9" />

      {/* Star - Ouro (#EF9F27) */}
      <path
        d="M 36 10 L 37.2 13.1 L 40.5 13.1 L 37.9 15.1 L 38.9 18.3 L 36 16.4 L 33.1 18.3 L 34.1 15.1 L 31.5 13.1 L 34.8 13.1 Z"
        fill="#EF9F27"
      />
    </svg>
  )
}
