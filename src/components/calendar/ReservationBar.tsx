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
  const topOffset = rowIndex * (cellHeight + 1)

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

  return (
    <div
      style={{
        position: 'absolute',
        left: `${leftOffset}px`,
        top: `${topOffset}px`,
        width: `${blockWidth}px`,
        height: `${cellHeight}px`,
        background: '#10203E',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: '12px',
        paddingRight: '12px',
        gap: '8px',
        zIndex: 10,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        pointerEvents: 'auto',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'
      }}
    >
      {/* Guest Name */}
      <div
        style={{
          fontSize: '13px',
          fontWeight: '700',
          color: '#ffffff',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flexShrink: 0,
          maxWidth: '120px',
        }}
      >
        {reservation.guestName}
      </div>

      {/* Divider */}
      <div
        style={{
          width: '1px',
          height: '20px',
          background: 'rgba(255,255,255,0.3)',
          flexShrink: 0,
        }}
      />

      {/* Guest Count + Status */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          alignItems: 'center',
          fontSize: '11px',
          color: '#a0aec0',
          flexShrink: 1,
          minWidth: 0,
          whiteSpace: 'nowrap',
        }}
      >
        <span>{reservation.guestCount || 1} hosp.</span>
        <span>•</span>
        <span>{getStatus()}</span>
      </div>
    </div>
  )
}
