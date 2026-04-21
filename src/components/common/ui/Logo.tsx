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
      {/* Icon — Lodgra house outline */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        {/* Roof: gold chevron */}
        <path
          d="M2 12L12 3L22 12"
          stroke={accentColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* House body: blue outline, open top */}
        <path
          d="M4 10V19C4 20.1046 4.89543 21 6 21H18C19.1046 21 20 20.1046 20 19V10"
          stroke={primaryColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
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
