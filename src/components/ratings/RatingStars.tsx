import { Star } from 'lucide-react'
import { generateStarRating } from '@/lib/ratings/normalize'

interface RatingStarsProps {
  rating: number
  maxStars?: number
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

export function RatingStars({
  rating,
  maxStars = 5,
  size = 'md',
  showText = true,
  className = '',
}: RatingStarsProps) {
  const sizeMap = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  }

  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5
  const emptyStars = Math.ceil(maxStars - rating)

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="flex gap-0.5">
        {/* Full stars */}
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star key={`full-${i}`} className={`${sizeMap[size]} fill-yellow-400 text-yellow-400`} />
        ))}

        {/* Half star */}
        {hasHalfStar && (
          <div key="half" className="relative">
            <Star className={`${sizeMap[size]} text-gray-300`} />
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <Star className={`${sizeMap[size]} fill-yellow-400 text-yellow-400`} />
            </div>
          </div>
        )}

        {/* Empty stars */}
        {Array.from({ length: emptyStars - (hasHalfStar ? 1 : 0) }).map((_, i) => (
          <Star key={`empty-${i}`} className={`${sizeMap[size]} text-gray-300`} />
        ))}
      </div>

      {showText && (
        <span className="text-sm font-semibold text-gray-700 ml-1">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  )
}
