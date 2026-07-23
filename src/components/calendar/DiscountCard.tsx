'use client'

interface DiscountCardProps {
  title: string
  condition: string
  discountPercent: number
  onEdit?: () => void
}

export function DiscountCard({
  title,
  condition,
  discountPercent,
  onEdit,
}: DiscountCardProps) {
  return (
    <button
      className="discount-card"
      onClick={onEdit}
      aria-label={`Edit ${title} discount`}
    >
      <div className="discount-card-content">
        <h4 className="discount-title">{title}</h4>
        <p className="discount-condition">{condition}</p>
      </div>

      <div className="discount-value">
        <span className="percent">{discountPercent}%</span>
      </div>

      <div className="edit-indicator">›</div>
    </button>
  )
}
