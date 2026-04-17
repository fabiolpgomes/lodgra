'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getCurrencySymbol, type CurrencyCode } from '@/lib/utils/currency'
import { Button } from '@/components/common/ui/button'
import { Input } from '@/components/common/ui/input'
import { Label } from '@/components/common/ui/label'
import { Alert, AlertDescription } from '@/components/common/ui/alert'

interface ReservationData {
  id: string
  property_listing_id: string
  check_in: string
  check_out: string
  status: string
  number_of_guests: number | null
  total_amount: number | string | null
  currency: string | null
  booking_source?: string | null
  external_id?: string | null
  guests?: { first_name: string; last_name: string; email: string; phone?: string } | null
}

interface ListingOption {
  id: string
  properties: { name: string }
  platforms?: { display_name: string } | null
}

interface EditReservationFormProps {
  reservation: ReservationData
  listings: ListingOption[]
}

export function EditReservationForm({ reservation, listings }: EditReservationFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [formData, setFormData] = useState({
    property_listing_id: reservation.property_listing_id,
    check_in: reservation.check_in,
    check_out: reservation.check_out,
    status: reservation.status,
    number_of_guests: reservation.number_of_guests || 1,
    total_amount: reservation.total_amount || '',
    currency: reservation.currency || 'EUR',
    guest_first_name: reservation.guests?.first_name || '',
    guest_last_name: reservation.guests?.last_name || '',
    guest_email: reservation.guests?.email || '',
    guest_phone: reservation.guests?.phone || '',
  })

  // Calcular noites
  const calculateNights = () => {
    if (!formData.check_in || !formData.check_out) return 0
    const checkIn = new Date(formData.check_in)
    const checkOut = new Date(formData.check_out)
    return Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
  }

  const nights = calculateNights()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validações
    if (new Date(formData.check_in) >= new Date(formData.check_out)) {
      setError('Check-out deve ser depois do check-in')
      setLoading(false)
      return
    }

    if (!formData.guest_first_name || !formData.guest_last_name || !formData.guest_email) {
      setError('Nome e email do hóspede são obrigatórios')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/reservations/${reservation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Reserva atualizada com sucesso!')
        router.push(`/reservations/${reservation.id}`)
        router.refresh()
      } else {
        const msg = data.error || 'Erro ao atualizar reserva'
        setError(msg)
        toast.error(msg || 'Erro ao atualizar reserva')
      }
    } catch {
      setError('Erro ao conectar com o servidor')
      toast.error('Erro ao atualizar reserva')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Anúncio */}
      <div>
        <Label htmlFor="property_listing_id" className="mb-1">
          Propriedade / Anúncio *
        </Label>
        <select
          id="property_listing_id"
          name="property_listing_id"
          value={formData.property_listing_id}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Selecione...</option>
          {listings.map((listing) => (
            <option key={listing.id} value={listing.id}>
              {listing.properties.name} - {listing.platforms?.display_name || 'Manual'}
            </option>
          ))}
        </select>
      </div>

      {/* Datas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="check_in" className="mb-1">
            Check-in *
          </Label>
          <Input
            type="date"
            id="check_in"
            name="check_in"
            value={formData.check_in}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <Label htmlFor="check_out" className="mb-1">
            Check-out *
          </Label>
          <Input
            type="date"
            id="check_out"
            name="check_out"
            value={formData.check_out}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      {nights > 0 && (
        <p className="text-sm text-gray-600">
          Total: <strong>{nights} noite(s)</strong>
        </p>
      )}

      {/* Dados do Hóspede */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Dados do Hóspede</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="guest_first_name" className="mb-1">
              Nome *
            </Label>
            <Input
              type="text"
              id="guest_first_name"
              name="guest_first_name"
              value={formData.guest_first_name}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <Label htmlFor="guest_last_name" className="mb-1">
              Sobrenome *
            </Label>
            <Input
              type="text"
              id="guest_last_name"
              name="guest_last_name"
              value={formData.guest_last_name}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <Label htmlFor="guest_email" className="mb-1">
              Email *
            </Label>
            <Input
              type="email"
              id="guest_email"
              name="guest_email"
              value={formData.guest_email}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <Label htmlFor="guest_phone" className="mb-1">
              Telefone
            </Label>
            <Input
              type="tel"
              id="guest_phone"
              name="guest_phone"
              value={formData.guest_phone}
              onChange={handleChange}
            />
          </div>
        </div>
      </div>

      {/* Detalhes da Reserva */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalhes da Reserva</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="status" className="mb-1">
              Status *
            </Label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="pending">Pendente</option>
              <option value="confirmed">Confirmada</option>
              <option value="cancelled">Cancelada</option>
            </select>
          </div>

          <div>
            <Label htmlFor="number_of_guests" className="mb-1">
              Nº de Hóspedes
            </Label>
            <Input
              type="number"
              id="number_of_guests"
              name="number_of_guests"
              value={formData.number_of_guests}
              onChange={handleChange}
              min="1"
            />
          </div>

          <div>
            <Label htmlFor="total_amount" className="mb-1">
              Valor Total ({getCurrencySymbol((formData.currency || 'EUR') as CurrencyCode)})
            </Label>
            <Input
              type="number"
              id="total_amount"
              name="total_amount"
              value={formData.total_amount}
              onChange={handleChange}
              step="0.01"
              min="0"
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      {/* Informações da Importação */}
      {reservation.booking_source && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Origem:</strong> {reservation.booking_source}
            {reservation.external_id && (
              <> | <strong>ID Externo:</strong> {reservation.external_id.substring(0, 20)}...</>
            )}
          </p>
        </div>
      )}

      {/* Botões */}
      <div className="flex items-center justify-end gap-4 border-t pt-6">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
