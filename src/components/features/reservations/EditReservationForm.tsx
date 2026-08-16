'use client'

import { useState } from 'react'
import { ReservationUI } from './types/reservation-ui'
import { Button } from '@/components/common/ui/button'
import { Input } from '@/components/common/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/common/ui/select'
import { X, Save } from 'lucide-react'

interface EditReservationFormProps {
  reservation: ReservationUI
  onClose: () => void
  onSave: (data: Partial<ReservationUI>) => Promise<void>
}

export function EditReservationForm({ reservation, onClose, onSave }: EditReservationFormProps) {
  const [formData, setFormData] = useState({
    guest_name: reservation.guest_name || '',
    guest_email: reservation.guest_email || '',
    guest_phone: reservation.guest_phone || '',
    reservation_status: reservation.status || 'confirmed',
    total_price: reservation.total_price?.toString() || '0',
    notes: reservation.notes || '',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
    setError(null)
  }

  const validateForm = (): boolean => {
    if (!formData.guest_name.trim()) {
      setError('Nome do hóspede é obrigatório')
      return false
    }
    if (formData.guest_email && !formData.guest_email.includes('@')) {
      setError('Email inválido')
      return false
    }
    if (isNaN(parseFloat(formData.total_price)) || parseFloat(formData.total_price) < 0) {
      setError('Valor deve ser um número positivo')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)
    try {
      await onSave({
        guest_name: formData.guest_name,
        guest_email: formData.guest_email,
        guest_phone: formData.guest_phone,
        status: formData.reservation_status as any,
        total_price: parseFloat(formData.total_price),
        notes: formData.notes || null,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Editar Reserva</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={loading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Guest Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome do Hóspede *
            </label>
            <Input
              type="text"
              value={formData.guest_name}
              onChange={e => handleChange('guest_name', e.target.value)}
              placeholder="Digite o nome do hóspede"
              disabled={loading}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <Input
              type="email"
              value={formData.guest_email}
              onChange={e => handleChange('guest_email', e.target.value)}
              placeholder="email@example.com"
              disabled={loading}
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefone
            </label>
            <Input
              type="tel"
              value={formData.guest_phone}
              onChange={e => handleChange('guest_phone', e.target.value)}
              placeholder="+351 912 345 678"
              disabled={loading}
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <Select value={formData.reservation_status} onValueChange={val => handleChange('reservation_status', val)}>
              <SelectTrigger disabled={loading}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="confirmed">Confirmada</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
                <SelectItem value="completed">Concluída</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Total Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor Total (EUR)
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.total_price}
              onChange={e => handleChange('total_price', e.target.value)}
              placeholder="0.00"
              disabled={loading}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas
            </label>
            <textarea
              value={formData.notes}
              onChange={e => handleChange('notes', e.target.value.slice(0, 200))}
              placeholder="Adicione informações adicionais sobre a reserva (máx 200 caracteres)"
              maxLength={200}
              rows={3}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">{formData.notes.length}/200 caracteres</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Salvando...' : 'Salvar Mudanças'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
