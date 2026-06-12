'use client'

interface ExistingEvent {
  type: 'reservation' | 'block'
  id: string
  title: string
}

interface SelectActionModalProps {
  checkIn: string
  checkOut: string
  existingEvents?: ExistingEvent[]
  onSelectReservation: () => void
  onSelectBlock: () => void
  onCancelReservation?: (id: string) => void
  onCancelBlock?: (id: string) => void
  onClose: () => void
}

export function SelectActionModal({
  checkIn,
  checkOut,
  existingEvents = [],
  onSelectReservation,
  onSelectBlock,
  onCancelReservation,
  onCancelBlock,
  onClose,
}: SelectActionModalProps) {
  const hasReservation = existingEvents.some(e => e.type === 'reservation')
  const hasBlock = existingEvents.some(e => e.type === 'block')

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Período Seleccionado</h2>
        <p className="text-sm text-gray-600 mb-6">
          {checkIn} até {checkOut}
        </p>

        {existingEvents.length > 0 && (
          <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs font-semibold text-amber-900 mb-2">Encontrados neste período:</p>
            <ul className="space-y-1">
              {existingEvents.map(event => (
                <li key={event.id} className="text-xs text-amber-800">
                  {event.type === 'reservation' ? '👤' : '🔒'} {event.title}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-3">
          {/* Cancelar Reserva */}
          {hasReservation && onCancelReservation && (
            <button
              onClick={() => {
                const reservation = existingEvents.find(e => e.type === 'reservation')
                if (reservation) onCancelReservation(reservation.id)
              }}
              className="w-full text-left p-4 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              <div className="font-semibold text-red-900">Cancelar Reserva</div>
              <div className="text-xs text-red-700">Remover a reserva existente</div>
            </button>
          )}

          {/* Cancelar Bloqueio */}
          {hasBlock && onCancelBlock && (
            <button
              onClick={() => {
                const block = existingEvents.find(e => e.type === 'block')
                if (block) onCancelBlock(block.id)
              }}
              className="w-full text-left p-4 border border-gray-400 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="font-semibold text-gray-900">Cancelar Bloqueio</div>
              <div className="text-xs text-gray-700">Remover o bloqueio existente</div>
            </button>
          )}

          {/* Nova Reserva */}
          <button
            onClick={onSelectReservation}
            className="w-full text-left p-4 border border-brand-200 rounded-lg hover:bg-brand-50 transition-colors"
          >
            <div className="font-semibold text-gray-900">Nova Reserva</div>
            <div className="text-xs text-gray-600">Criar uma reserva de hóspede para este período</div>
          </button>

          {/* Bloquear Datas */}
          <button
            onClick={onSelectBlock}
            className="w-full text-left p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="font-semibold text-gray-900">Bloquear Datas</div>
            <div className="text-xs text-gray-600">Marcar datas como indisponíveis (manutenção, etc.)</div>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
