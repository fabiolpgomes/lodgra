import React from 'react'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'light' | 'dark'
  className?: string
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  }

  return (
    <svg 
      viewBox="0 0 24 24" 
      className={`${sizes[size]} ${className}`}
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Corpo da Casa - Azul Confiança (#1E3A8A) */}
      <path 
        d="M4 10V19C4 20.1046 4.89543 21 6 21H18C19.1046 21 20 20.1046 20 19V10" 
        stroke="#1E3A8A" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      {/* Telhado - Ouro Próspero (#D4AF37) */}
      <path 
        d="M2 12L12 3L22 12" 
        stroke="#D4AF37" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      {/* Chaminé / Detalhe - Ouro Próspero (#D4AF37) */}
      <path 
        d="M12 3V7" 
        stroke="#D4AF37" 
        strokeWidth="2" 
        strokeLinecap="round"
      />
    </svg>
  )
}
