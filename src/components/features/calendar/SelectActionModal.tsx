'use client'

interface SelectActionModalProps {
  checkIn: string
  checkOut: string
  onSelectReservation: () => void
  onSelectBlock: () => void
  onClose: () => void
}

export function SelectActionModal({
  checkIn,
  checkOut,
  onSelectReservation,
  onSelectBlock,
  onClose,
}: SelectActionModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Período Seleccionado</h2>
        <p className="text-sm text-gray-600 mb-6">
          {checkIn} até {checkOut}
        </p>

        <div className="space-y-3">
          {/* Nova Reserva */}
          <button
            onClick={onSelectReservation}
            className="w-full text-left p-4 border border-brand-200 rounded-lg hover:bg-brand-50 transition-colors"
          >
            <div className="font-semibold text-gray-900">Nova Reserva</div>
            <div className="text-sm text-gray-600">Criar uma reserva de hóspede para este período</div>
          </button>

          {/* Bloquear Datas */}
          <button
            onClick={onSelectBlock}
            className="w-full text-left p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="font-semibold text-gray-900">Bloquear Datas</div>
            <div className="text-sm text-gray-600">Marcar datas como indisponíveis (manutenção, etc.)</div>
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
