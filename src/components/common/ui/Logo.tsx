import Image from 'next/image'

interface LogoProps {
  variant?: 'default' | 'white' | 'compact'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: { height: 32, width: 36 },
  md: { height: 48, width: 54 },
  lg: { height: 64, width: 72 },
}

export function Logo({ size = 'md', className = '' }: LogoProps) {
  const { height, width } = sizes[size]

  // Note: For 'white' variant, we might need a different image file if one exists.
  // Since only the vertical logo was provided, we use it as default.
  const src = '/brand/lodgra-logo-vertical.png'

  return (
    <div className={`inline-flex items-center ${className}`}>
      <Image
        src={src}
        alt="Lodgra Logo"
        height={height}
        width={width}
        className="object-contain"
        priority
      />
    </div>
  )
}
