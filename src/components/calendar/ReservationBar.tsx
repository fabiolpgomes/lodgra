'use client'

interface Reservation {
  id: string
  propertyId: string
  guestName: string
  guestCount?: number
  startDate: Date
  endDate: Date
  price: number
  status: 'pending' | 'confirmed' | 'hosting' | 'completed'
}

interface ReservationBarProps {
  reservation: Reservation
  dayStartIndex: number
  totalDays: number
  rowIndex: number
  cellWidth?: number
  cellGap?: number
  cellHeight?: number
}

// Color palette for different guests - Using primary blue from design.md with variations
const GUEST_COLORS = [
  '#10203E', // Primary institutional blue
  '#0c1830', // Primary active (darker)
  '#152543', // Slightly lighter
  '#1a2d4d', // Medium
  '#0f1c2e', // Darker variant
]

// Generate consistent color for guest based on name hash
const getGuestColor = (guestName: string, reservationId: string): string => {
  const hash = (guestName + reservationId).split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0)
  }, 0)
  return GUEST_COLORS[hash % GUEST_COLORS.length]
}

export function ReservationBar({
  reservation,
  dayStartIndex,
  totalDays,
  rowIndex,
  cellWidth = 85,
  cellGap = 1,
  cellHeight = 90,
}: ReservationBarProps) {
  // Calculate exact positioning
  // Reduce totalDays by 1 since checkout day is exclusive (start of next reservation)
  const adjustedDays = Math.max(1, totalDays - 1)
  const blockWidth = adjustedDays * cellWidth + (adjustedDays - 1) * cellGap
  const leftOffset = dayStartIndex * (cellWidth + cellGap)
  const topOffset = rowIndex * (cellHeight + 1) + 20 // Slightly lower to create gap between rows

  // Determine status
  const getStatus = () => {
    const start = new Date(reservation.startDate)
    const end = new Date(reservation.endDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (today >= start && today < end) {
      return 'Hospedando'
    } else if (start > today) {
      return 'Confirmado'
    }
    return 'Confirmado'
  }

  // Format price - total reservation price
  const formatPrice = (price: number) => {
    return `R$ ${price.toFixed(2)}`
  }

  const guestColor = getGuestColor(reservation.guestName, reservation.id)
  const status = getStatus()

  return (
    <div
      style={{
        position: 'absolute',
        left: `${leftOffset}px`,
        top: `${topOffset}px`,
        width: `${blockWidth}px`,
        height: '24px',
        background: guestColor,
        borderRadius: '20px',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: '14px',
        paddingRight: '14px',
        gap: '8px',
        zIndex: 20,
        boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
        pointerEvents: 'auto',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        fontSize: '11px',
        color: '#ffffff',
        fontWeight: '600',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.12)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
      title={`${reservation.guestName} • ${formatPrice(reservation.price)} • ${status}`}
    >
      {/* Guest Name */}
      <div
        style={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flexShrink: 0,
          minWidth: '0',
          maxWidth: blockWidth > 200 ? '120px' : '80px',
        }}
      >
        {reservation.guestName}
      </div>

      {/* Price - always show */}
      <div style={{ whiteSpace: 'nowrap', flexShrink: 0, fontWeight: '700' }}>
        {formatPrice(reservation.price || 0)}
      </div>

      {/* Status - only if enough space */}
      {blockWidth > 200 && (
        <div style={{ whiteSpace: 'nowrap', flexShrink: 0, marginLeft: 'auto', fontSize: '10px' }}>
          {status}
        </div>
      )}
    </div>
  )
}
