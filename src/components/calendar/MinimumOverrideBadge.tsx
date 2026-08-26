'use client'

interface MinimumOverrideBadgeProps {
  minimumNights: string | number
  className?: string
}

export function MinimumOverrideBadge({
  minimumNights,
  className = '',
}: MinimumOverrideBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-800 ${className}`}
    >
      Exceção aprovada · mín. {minimumNights} noites
    </span>
  )
}
