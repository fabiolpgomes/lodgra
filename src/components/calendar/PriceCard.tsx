'use client'

interface PriceCardProps {
  title: string
  value: string | number
  currency?: string
  subtitle?: string
}

export function PriceCard({
  title,
  value,
  currency = 'EUR',
  subtitle,
}: PriceCardProps) {
  return (
    <div className="price-card">
      <div className="price-card-content">
        <h4 className="price-title">{title}</h4>
        <div className="price-value">
          {typeof value === 'number' ? (
            <>
              <span className="currency">{currency}</span>
              <span className="amount">{value.toFixed(0)}</span>
              {subtitle && <span className="subtitle">{subtitle}</span>}
            </>
          ) : (
            <span className="amount">{value}</span>
          )}
        </div>
      </div>

      <style jsx>{`
        .price-card {
          padding: 16px;
          background: #f9fafb;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }

        .price-card-content {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .price-title {
          margin: 0;
          font-size: 14px;
          font-weight: 500;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .price-value {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }

        .currency {
          font-size: 16px;
          color: #374151;
          font-weight: 600;
        }

        .amount {
          font-size: 28px;
          font-weight: 700;
          color: #1f2937;
        }

        .subtitle {
          font-size: 12px;
          color: #9ca3af;
          font-weight: 400;
          margin-top: 4px;
          display: block;
        }
      `}</style>
    </div>
  )
}
