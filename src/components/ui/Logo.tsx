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
  const src = '/brand/lodgra-logo-vertical.png'

  return (
    <div className={`inline-flex items-center ${className}`}>
      <Image
        src={src}
        alt="Lodgra"
        height={height}
        width={width}
        className="object-contain"
        priority
      />
    </div>
  )
}
