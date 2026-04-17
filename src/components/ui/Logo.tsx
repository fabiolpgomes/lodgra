interface LogoProps {
  variant?: 'default' | 'white' | 'compact'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: { icon: 20, text: 'text-sm', gap: 'gap-1.5' },
  md: { icon: 26, text: 'text-base', gap: 'gap-2' },
  lg: { icon: 32, text: 'text-xl', gap: 'gap-2.5' },
}

export function Logo({ variant = 'default', size = 'md', className = '' }: LogoProps) {
  const { icon: iconSize, text: textSize, gap } = sizes[size]

  const primaryColor = variant === 'white' ? '#FFFFFF' : 'var(--lodgra-blue-600, #1E3A8A)'
  const accentColor  = variant === 'white' ? 'rgba(255,255,255,0.8)' : 'var(--lodgra-gold-500, #D4AF37)'
  const textColor    = variant === 'white' ? '#FFFFFF' : 'var(--lodgra-blue-900, #0F172A)'

  return (
    <div className={`inline-flex items-center ${gap} ${className}`}>
      {/* Icon — Lodgra house + ascending arrow */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
      >
        {/* Roof (Golden Ascending Arrow) */}
        <path
          d="M4 18L16 6L28 18"
          stroke={accentColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* House body (Blue) */}
        <rect
          x="8"
          y="18"
          width="16"
          height="14"
          rx="1"
          fill={primaryColor}
        />
        {/* Windows (subtle gold detail) */}
        <rect
          x="12"
          y="22"
          width="2.5"
          height="2.5"
          fill={accentColor}
          opacity="0.6"
          rx="0.5"
        />
        <rect
          x="17.5"
          y="22"
          width="2.5"
          height="2.5"
          fill={accentColor}
          opacity="0.6"
          rx="0.5"
        />
      </svg>

      {variant !== 'compact' && (
        <span
          className={`font-bold tracking-tight ${textSize}`}
          style={{ color: textColor, fontFamily: 'var(--font-geist-sans, system-ui)' }}
        >
          Lodgra
        </span>
      )}
    </div>
  )
}
