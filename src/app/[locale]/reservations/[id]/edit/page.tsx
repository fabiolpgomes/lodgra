'use client'

import { useState, useEffect } from 'react'
import { useRouter, useLocale } from '@/lib/i18n/routing'
import Link from 'next/link'
import { ArrowLeft, Save, Calendar, Users, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { Button } from '@/components/common/ui/button'
import { Input } from '@/components/common/ui/input'
import { Label } from '@/components/common/ui/label'
import { Alert, AlertDescription } from '@/components/common/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/common/ui/select'
import { toast } from 'sonner'
import { Skeleton } from '@/components/common/ui/skeleton'

export default function EditReservationPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
   const router = useRouter()
  const locale = useLocale()
  const prefix = locale ? `/${locale}` : ''
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reservation, setReservation] = useState<Record<string, string | number | null> | null>(null)
  const [reservationId, setReservationId] = useState<string>('')
  const [properties, setProperties] = useState<{ id: string; name: string; currency: string; city?: string | null }[]>([])
  const [propertyListings, setPropertyListings] = useState<{ id: string; property_id: string; external_listing_id?: string | null; platforms?: { display_name: string } | null }[]>([])
  const [selectedProperty, setSelectedProperty] = useState('')
  const [selectedListing, setSelectedListing] = useState('')

  useEffect(() => {
    async function loadData() {
      const { id } = await params
      setReservationId(id)

      const { data: reservationData, error: reservationError } = await supabase
        .from('reservations')
        .select(`
          *,
          property_listings!inner(
            id,
            property_id,
            properties!inner(
              id,
              name
            )
          ),
          guests(
            id,
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .eq('id', id)
        .single()

      if (reservationError || !reservationData) {
        setError('Reserva não encontrada')
        setLoadingData(false)
        return
      }

      setReservation(reservationData)
      setSelectedProperty(reservationData.property_listings.property_id)
      setSelectedListing(reservationData.property_listing_id)

      const { data: propertiesData } = await supabase
        .from('properties')
        .select('*')
        .eq('is_active', true)
        .order('name')

      setProperties(propertiesData || [])

      const { data: listingsData } = await supabase
        .from('property_listings')
        .select('*')
        .eq('property_id', reservationData.property_listings.property_id)
        .eq('is_active', true)

      setPropertyListings(listingsData || [])
      setLoadingData(false)
    }

    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (selectedProperty && reservation) {
      async function loadListings() {
        const { data } = await supabase
          .from('property_listings')
          .select('*')
          .eq('property_id', selectedProperty)
          .eq('is_active', true)
        setPropertyListings(data || [])
      }
      loadListings()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProperty])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    try {
      const checkInStr = formData.get('check_in') as string
      const checkOutStr = formData.get('check_out') as string

      // Validação: Checar disponibilidade (excluindo a reserva atual)
      const availabilityResponse = await fetch('/api/reservations/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: selectedProperty,
          check_in: checkInStr,
          check_out: checkOutStr,
          exclude_reservation_id: reservationId,
        }),
      })

      if (!availabilityResponse.ok) {
        const availabilityError = await availabilityResponse.json()
        setError(`Erro ao verificar disponibilidade: ${availabilityError.error}`)
        setLoading(false)
        return
      }

      const availability = await availabilityResponse.json()

      if (!availability.available) {
        const conflicts = availability.conflicting_reservations as Array<{ check_in: string; check_out: string; guest_name?: string }>
        const conflictDates = conflicts
          .map((c) => `${c.check_in} a ${c.check_out}${c.guest_name ? ` (${c.guest_name})` : ''}`)
          .join('\n')
        setError(
          `As datas selecionadas já estão bloqueadas:\n\n${conflictDates}\n\nPor favor, escolha outras datas.`
        )
        setLoading(false)
        return
      }

      const guestEmail = formData.get('guest_email') as string
      const guestFirstName = formData.get('guest_first_name') as string
      const guestLastName = formData.get('guest_last_name') as string

      if (reservation?.guest_id && guestEmail) {
        await supabase
          .from('guests')
          .update({
            first_name: guestFirstName,
            last_name: guestLastName,
            email: guestEmail,
            phone: formData.get('guest_phone') as string || null,
          })
          .eq('id', reservation?.guest_id)
      }

      const { error: updateError } = await supabase
        .from('reservations')
        .update({
          property_listing_id: selectedListing,
          check_in: checkInStr,
          check_out: checkOutStr,
          number_of_guests: parseInt(formData.get('number_of_guests') as string) || 1,
          total_amount: parseFloat(formData.get('total_amount') as string) || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reservationId)

      if (updateError) throw updateError

      // Sincronizar com plataformas (fire-and-forget)
      fetch('/api/reservations/sync-to-platforms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation_id: reservationId }),
      }).catch(err => console.error('Erro ao sincronizar com plataformas:', err))

      toast.success('Reserva atualizada com sucesso!')
      router.push(`/reservations/${reservationId}`)
      router.refresh()
    } catch (err: unknown) {
      console.error('Erro ao atualizar reserva:', err)
      const message = err instanceof Error ? err.message : 'Erro ao atualizar reserva'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <AuthLayout>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-4 w-32 mb-6" />
          <Skeleton className="h-8 w-48 mb-1" />
          <Skeleton className="h-4 w-64 mb-8" />
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
            <div className="flex gap-4 pt-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </div>
      </AuthLayout>
    )
  }

  if (error && !reservation) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Link href={`${prefix}/reservations`} className="text-blue-600 hover:underline">
              Voltar para Reservas
            </Link>
          </div>
        </div>
      </AuthLayout>
    )
  }

  const guest = reservation?.guests as unknown as { first_name: string; last_name: string; email: string | null; phone: string | null } | null

  return (
    <AuthLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href={reservationId ? `${prefix}/reservations/${reservationId}` : `${prefix}/reservations`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Detalhes
        </Link>

        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Editar Reserva</h2>
          <p className="text-gray-600 mt-1">Atualize as informações da reserva</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Propriedade
            </h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="property_id" className="mb-1">
                  Selecione a Propriedade *
                </Label>
                <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Escolha uma propriedade..." />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.name} - {property.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedProperty && propertyListings.length > 0 && (
                <div>
                  <Label htmlFor="property_listing_id" className="mb-1">
                    Anúncio / Plataforma *
                  </Label>
                  <Select value={selectedListing} onValueChange={setSelectedListing}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Escolha o anúncio..." />
                    </SelectTrigger>
                    <SelectContent>
                      {propertyListings.map((listing) => (
                        <SelectItem key={listing.id} value={listing.id}>
                          Anúncio #{listing.external_listing_id || listing.id.slice(0, 8)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Período da Reserva
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="check_in" className="mb-1">
                  Check-in *
                </Label>
                <Input
                  type="date"
                  id="check_in"
                  name="check_in"
                  required
                  defaultValue={(reservation?.check_in as string) || ''}
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
                  required
                  defaultValue={(reservation?.check_out as string) || ''}
                />
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Informações do Hóspede
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="guest_first_name" className="mb-1">
                    Nome *
                  </Label>
                  <Input
                    type="text"
                    id="guest_first_name"
                    name="guest_first_name"
                    required
                    defaultValue={guest?.first_name || ''}
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
                    required
                    defaultValue={guest?.last_name || ''}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="guest_email" className="mb-1">
                    Email *
                  </Label>
                  <Input
                    type="email"
                    id="guest_email"
                    name="guest_email"
                    required
                    defaultValue={guest?.email || ''}
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
                    defaultValue={guest?.phone || ''}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="number_of_guests" className="mb-1">
                  Número de Hóspedes *
                </Label>
                <Input
                  type="number"
                  id="number_of_guests"
                  name="number_of_guests"
                  min="1"
                  defaultValue={(reservation?.number_of_guests as number) || 1}
                  required
                />
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Valor da Reserva</h3>
            <div>
              <Label htmlFor="total_amount" className="mb-1">
                Valor Total (€)
              </Label>
              <Input
                type="number"
                id="total_amount"
                name="total_amount"
                step="0.01"
                min="0"
                defaultValue={reservation?.total_amount as string || ''}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={loading || !selectedProperty || propertyListings.length === 0}
              className="flex-1"
            >
              {loading ? <>Salvando...</> : <><Save className="h-5 w-5" />Salvar Alterações</>}
            </Button>
            <Button variant="outline" asChild>
              <Link href={reservationId ? `${prefix}/reservations/${reservationId}` : `${prefix}/reservations`}>
                Cancelar
              </Link>
            </Button>
          </div>
        </form>
      </div>
    </AuthLayout>
  )
}
