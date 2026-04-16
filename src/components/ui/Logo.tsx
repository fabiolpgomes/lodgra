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

  const primaryColor = variant === 'white' ? '#FFFFFF' : 'var(--hs-brand-500, #1567A8)'
  const accentColor  = variant === 'white' ? 'rgba(255,255,255,0.7)' : 'var(--hs-accent-500, #E8614A)'
  const textColor    = variant === 'white' ? '#FFFFFF' : 'var(--hs-neutral-900, #111827)'

  return (
    <div className={`inline-flex items-center ${gap} ${className}`}>
      {/* Icon — stylised roof/home glyph */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
      >
        {/* Roof */}
        <path
          d="M3 15L16 4L29 15"
          stroke={primaryColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* House body */}
        <path
          d="M6 14V27C6 27.552 6.448 28 7 28H13V21H19V28H25C25.552 28 26 27.552 26 27V14"
          stroke={primaryColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Door accent dot (coral) */}
        <circle
          cx="16"
          cy="22"
          r="1.5"
          fill={accentColor}
        />
      </svg>

      {variant !== 'compact' && (
        <span
          className={`font-semibold tracking-tight ${textSize}`}
          style={{ color: textColor, fontFamily: 'var(--font-geist-sans, system-ui)' }}
        >
          Home{' '}
          <span style={{ color: primaryColor }}>Stay</span>
        </span>
      )}
    </div>
  )
}
