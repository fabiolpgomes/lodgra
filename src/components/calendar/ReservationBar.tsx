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
  const blockWidth = totalDays * cellWidth + (totalDays - 1) * cellGap
  const leftOffset = dayStartIndex * (cellWidth + cellGap)
  const topOffset = rowIndex * (cellHeight + 1) + 15

  console.log('ReservationBar rendering:', {
    guest: reservation.guestName,
    width: blockWidth,
    left: leftOffset,
    top: topOffset,
  })

  // Determine status
  const getStatus = () => {
    const start = new Date(reservation.startDate)
    const end = new Date(reservation.endDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (today >= start && today < end) {
      return 'Atualmente a Hospedar'
    } else if (start > today) {
      return 'Confirmado'
    }
    return 'Confirmado'
  }

  // Format price
  const formatPrice = (price: number) => {
    return `R$ ${price.toFixed(2)}`
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: `${leftOffset}px`,
        top: `${topOffset}px`,
        width: `${blockWidth}px`,
        height: '30px',
        background: '#1a7a85',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: '12px',
        paddingRight: '12px',
        gap: '12px',
        zIndex: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        pointerEvents: 'auto',
        cursor: 'pointer',
        transition: 'all 0.2s',
        fontSize: '12px',
        color: '#ffffff',
        fontWeight: '600',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)'
        e.currentTarget.style.background = '#156670'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'
        e.currentTarget.style.background = '#1a7a85'
      }}
    >
      {/* Guest Name */}
      <div
        style={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flexShrink: 0,
          maxWidth: '140px',
        }}
      >
        {reservation.guestName}
      </div>

      {/* Guest Count */}
      <div style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
        {reservation.guestCount || 1} hosp.
      </div>

      {/* Price */}
      <div style={{ whiteSpace: 'nowrap', flexShrink: 0, fontWeight: '700' }}>
        {formatPrice(reservation.price || 0)}
      </div>

      {/* Status */}
      <div style={{ whiteSpace: 'nowrap', flexShrink: 0, marginLeft: 'auto' }}>
        {getStatus()}
      </div>
    </div>
  )
}
