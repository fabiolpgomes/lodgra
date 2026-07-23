'use client'

interface AvailabilityCardProps {
  title: string
  value: string | number
  onEdit?: () => void
}

export function AvailabilityCard({
  title,
  value,
  onEdit,
}: AvailabilityCardProps) {
  return (
    <button
      className="availability-card"
      onClick={onEdit}
      aria-label={`Edit ${title}`}
    >
      <div className="availability-card-content">
        <h4 className="availability-title">{title}</h4>
      </div>

      <div className="availability-value">
        <span className="value">{value}</span>
      </div>

      <div className="edit-indicator">›</div>
    </button>
  )
}
