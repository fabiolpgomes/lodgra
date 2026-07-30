'use client'

import { useState } from 'react'
import { ValidationResultsDisplay } from './ValidationResultsDisplay'
import type { ValidationResult } from '@/lib/reservations/reservation-validator'

interface DirectBookingFormProps {
  onSuccess?: (reservationId: string) => void
}

export function DirectBookingForm({ onSuccess }: DirectBookingFormProps) {
  const [formData, setFormData] = useState({
    propertyId: '',
    guestName: '',
    guestEmail: '',
    checkIn: '',
    checkOut: '',
    guestCount: '',
    notes: '',
    priceOverride: '',
  })

  const [loading, setLoading] = useState(false)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [creationLoading, setCreationLoading] = useState(false)
  const [creationError, setCreationError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<{ id: string; message: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleValidateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setValidationResult(null)
    setLoading(true)

    try {
      const response = await fetch('/api/admin/reservations/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: formData.propertyId,
          checkIn: formData.checkIn,
          checkOut: formData.checkOut,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Validation failed')
      }

      const data: ValidationResult = await response.json()
      setValidationResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateReservation = async () => {
    setCreationLoading(true)
    setCreationError(null)

    try {
      const response = await fetch('/api/admin/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: formData.propertyId,
          checkIn: formData.checkIn,
          checkOut: formData.checkOut,
          guestName: formData.guestName,
          guestEmail: formData.guestEmail,
          guestCount: formData.guestCount ? parseInt(formData.guestCount) : undefined,
          notes: formData.notes || undefined,
          finalPrice: validationResult?.finalPrice,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Creation failed')
      }

      const data = await response.json()
      setSuccessMessage({
        id: data.reservationId,
        message: data.message,
      })

      // Reset form
      setFormData({
        propertyId: '',
        guestName: '',
        guestEmail: '',
        checkIn: '',
        checkOut: '',
        guestCount: '',
        notes: '',
        priceOverride: '',
      })
      setValidationResult(null)

      if (onSuccess) {
        onSuccess(data.reservationId)
      }
    } catch (err) {
      setCreationError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setCreationLoading(false)
    }
  }

  const canConfirm = validationResult?.success === true

  return (
    <div className="space-y-6">
      {/* Form Card */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900">Criar Reserva Manual</h2>
          <p className="text-sm text-gray-600 mt-1">
            Insira os detalhes da reserva e valide antes de confirmar
          </p>
        </div>

        <div className="p-6">
          <form onSubmit={handleValidateSubmit} className="space-y-4">
            {/* Row 1: Property & Guest Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Propriedade *</label>
                <input
                  type="text"
                  name="propertyId"
                  placeholder="ex: prop-123"
                  value={formData.propertyId}
                  onChange={handleInputChange}
                  required
                  disabled={loading || creationLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nome do Hóspede *</label>
                <input
                  type="text"
                  name="guestName"
                  placeholder="ex: João Silva"
                  value={formData.guestName}
                  onChange={handleInputChange}
                  required
                  disabled={loading || creationLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Row 2: Email & Guest Count */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email do Hóspede *</label>
                <input
                  type="email"
                  name="guestEmail"
                  placeholder="ex: joao@email.com"
                  value={formData.guestEmail}
                  onChange={handleInputChange}
                  required
                  disabled={loading || creationLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Quantidade de Hóspedes</label>
                <input
                  type="number"
                  name="guestCount"
                  placeholder="ex: 2"
                  value={formData.guestCount}
                  onChange={handleInputChange}
                  disabled={loading || creationLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Row 3: Check-in & Check-out */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Check-in *</label>
                <input
                  type="date"
                  name="checkIn"
                  value={formData.checkIn}
                  onChange={handleInputChange}
                  required
                  disabled={loading || creationLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Check-out *</label>
                <input
                  type="date"
                  name="checkOut"
                  value={formData.checkOut}
                  onChange={handleInputChange}
                  required
                  disabled={loading || creationLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Row 4: Notes */}
            <div>
              <label className="block text-sm font-medium mb-1">Notas</label>
              <textarea
                name="notes"
                placeholder="ex: Hóspede pedido special para late checkout"
                value={formData.notes}
                onChange={handleInputChange}
                disabled={loading || creationLoading}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Validate Button */}
            <button
              type="submit"
              disabled={loading || creationLoading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? 'Validando...' : 'Validar Reserva'}
            </button>
          </form>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm text-red-800">
            <strong>Erro:</strong> {error}
          </div>
        </div>
      )}

      {/* Validation Results */}
      {validationResult && <ValidationResultsDisplay result={validationResult} />}

      {/* Confirmation Button - Only shown if validation passed */}
      {canConfirm && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <button
            onClick={handleCreateReservation}
            disabled={creationLoading}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 transition-colors"
          >
            {creationLoading ? 'Criando reserva...' : 'Confirmar Reserva'}
          </button>
          {creationError && (
            <div className="mt-3 text-sm text-red-700">
              <strong>Erro ao criar:</strong> {creationError}
            </div>
          )}
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
          <div className="text-sm font-semibold text-green-700">
            ✅ Reserva criada com sucesso!
          </div>
          <div className="mt-2 text-sm text-green-700">
            <strong>ID da Reserva:</strong> {successMessage.id}
          </div>
          <div className="mt-2 text-sm text-green-700">{successMessage.message}</div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            Nova Reserva
          </button>
        </div>
      )}
    </div>
  )
}
