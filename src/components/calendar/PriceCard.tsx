'use client'

interface PriceCardProps {
  title: string
  value: string | number
  currency?: string
  action?: 'toggle' | 'edit' | 'remove'
  onAction?: () => void
  isActive?: boolean
}

export function PriceCard({
  title,
  value,
  currency = 'EUR',
  action,
  onAction,
  isActive = true,
}: PriceCardProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (action && onAction) {
      e.preventDefault()
      onAction()
    }
  }

  return (
    <div className="price-card" role="presentation">
      <div className="price-card-content">
        <h4 className="price-title">{title}</h4>
        <div className="price-value">
          {typeof value === 'number' ? (
            <>
              <span className="currency">{currency}</span>
              <span className="amount">{value.toFixed(0)}</span>
            </>
          ) : (
            <span className="amount">{value}</span>
          )}
        </div>
      </div>

      {action === 'toggle' && (
        <button
          className={`toggle-button ${isActive ? 'active' : 'inactive'}`}
          onClick={handleClick}
          aria-label={`Toggle ${title}`}
        >
          <div className="toggle-switch" />
        </button>
      )}

      {action === 'edit' && (
        <button
          className="action-button edit"
          onClick={handleClick}
          aria-label={`Edit ${title}`}
        >
          ✎
        </button>
      )}

      {action === 'remove' && (
        <button
          className="action-button remove"
          onClick={handleClick}
          aria-label={`Remove ${title}`}
        >
          ✕
        </button>
      )}
    </div>
  )
}
