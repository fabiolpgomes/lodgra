'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams, useLocale } from '@/lib/i18n/routing'
import Link from 'next/link'
import { Building2 } from 'lucide-react'
import { ArrowLeft, Save, Calendar, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { Button } from '@/components/common/ui/button'
import { Input } from '@/components/common/ui/input'
import { Label } from '@/components/common/ui/label'
import { Alert, AlertDescription } from '@/components/common/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/common/ui/select'
import { toast } from 'sonner'

export default function NewReservationPage() {
  const router = useRouter()
  const locale = useLocale()
  const prefix = locale ? `/${locale}` : ''
  const searchParams = useSearchParams()
  const preCheckIn = searchParams.get('check_in') || ''
  const preCheckOut = searchParams.get('check_out') || ''
  const prePropertyId = searchParams.get('property_id') || ''

  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [properties, setProperties] = useState<{ id: string; name: string; currency: string; city?: string | null; min_nights: number }[]>([])
  const [propertyListings, setPropertyListings] = useState<{ id: string; property_id: string; external_listing_id?: string | null; platforms: { display_name: string } | null }[]>([])
  const [selectedProperty, setSelectedProperty] = useState(prePropertyId)
  const [selectedListing, setSelectedListing] = useState('')

  useEffect(() => {
    async function loadProperties() {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) {
        console.error('Erro ao carregar propriedades:', error)
        return
      }

      const formattedData = (data || []).map(p => ({
        ...p,
        min_nights: p.min_nights || 1
      }))
      setProperties(formattedData)
    }

    loadProperties()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (selectedProperty) {
      async function loadListings() {
        const { data, error } = await supabase
          .from('property_listings')
          .select('id, property_id, external_listing_id, platform_id, platforms!inner(display_name)')
          .eq('property_id', selectedProperty)
          .eq('is_active', true)

        if (error) {
          console.error('Erro ao carregar anúncios:', error)
          return
        }

        // Transform data to match expected type
        type ListingData = {
          id: string
          property_id: string
          external_listing_id: string | null
          platforms: Array<{ display_name: string }> | { display_name: string } | null
        }

        const transformedData = (data as ListingData[] || []).map((item) => ({
          id: item.id,
          property_id: item.property_id,
          external_listing_id: item.external_listing_id,
          platforms: Array.isArray(item.platforms) && item.platforms.length > 0 ? item.platforms[0] : (item.platforms && !Array.isArray(item.platforms) ? item.platforms : null),
        }))

        setPropertyListings(transformedData)
        setSelectedListing('')
      }

      loadListings()
    } else {
      setPropertyListings([])
      setSelectedListing('')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProperty])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    // Validação: propriedade e anúncio obrigatórios
    if (!selectedProperty || !selectedListing) {
      setError('Seleccione a propriedade e o anúncio')
      setLoading(false)
      return
    }

    const checkInStr = formData.get('check_in') as string
    const checkOutStr = formData.get('check_out') as string

    // Validação: Checar disponibilidade (ANTES de criar a reserva)
    try {
      const availabilityResponse = await fetch('/api/reservations/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: selectedProperty,
          check_in: checkInStr,
          check_out: checkOutStr,
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
    } catch (err) {
      console.error('Erro ao verificar disponibilidade:', err)
      setError('Erro ao verificar disponibilidade. Tente novamente.')
      setLoading(false)
      return
    }

    // Validação: Noites mínimas (Apenas aviso, permite bypass se confirmado)
    if (checkInStr && checkOutStr) {
      const checkIn = new Date(checkInStr)
      const checkOut = new Date(checkOutStr)
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
      const property = properties.find(p => p.id === selectedProperty)

      if (property && nights < property.min_nights) {
        const confirm = window.confirm(
          `Aviso: A propriedade "${property.name}" tem um requisito de estadia mínima de ${property.min_nights} noites. \n\nAtualmente esta reserva tem apenas ${nights} noites. \n\nDeseja prosseguir assim mesmo?`
        )
        if (!confirm) {
          setLoading(false)
          return
        }
      }
    }

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        setError('Sessão expirada. Faça login novamente.')
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (!profile?.organization_id) {
        setError('Organização não encontrada')
        setLoading(false)
        return
      }

      const organizationId = profile.organization_id

      // Criar ou buscar hóspede
      const guestEmail = formData.get('guest_email') as string
      const guestFirstName = formData.get('guest_first_name') as string
      const guestLastName = formData.get('guest_last_name') as string

      let guestId = null

      if (guestEmail) {
        // Verificar se hóspede já existe via API endpoint (bypasses RLS)
        const checkResponse = await fetch('/api/guests/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: guestEmail,
            organization_id: organizationId,
          }),
        })

        if (!checkResponse.ok) {
          const checkError = await checkResponse.json()
          throw new Error(`Erro ao verificar guest: ${checkError.error}`)
        }

        const checkData = await checkResponse.json()

        if (checkData.exists && checkData.guest) {
          guestId = checkData.guest.id
        } else {
          // Criar novo hóspede com organization_id
          const { data: newGuest, error: guestError } = await supabase
            .from('guests')
            .insert({
              first_name: guestFirstName,
              last_name: guestLastName,
              email: guestEmail,
              phone: formData.get('guest_phone') as string || null,
              organization_id: organizationId,
            })
            .select()
            .single()

          if (guestError) throw guestError
          guestId = newGuest.id
        }
      }

      // Buscar moeda da propriedade
      const listingId = selectedListing
      const { data: listing } = await supabase
        .from('property_listings')
        .select('property_id, properties!inner(currency)')
        .eq('id', listingId)
        .single()

      const propertyCurrency = (listing?.properties as { currency?: string } | null)?.currency || 'EUR'

      // Criar reserva
      const { data, error: insertError } = await supabase
        .from('reservations')
        .insert({
          property_listing_id: listingId,
          guest_id: guestId,
          check_in: formData.get('check_in') as string,
          check_out: formData.get('check_out') as string,
          number_of_guests: parseInt(formData.get('number_of_guests') as string) || 1,
          total_amount: parseFloat(formData.get('total_amount') as string) || null,
          currency: propertyCurrency,
          status: 'confirmed',
          booking_source: 'manual',
          guest_name: (formData.get('guest_first_name') as string) + ' ' + (formData.get('guest_last_name') as string),
          guest_email: formData.get('guest_email') as string,
          guest_phone: (formData.get('guest_phone') as string) || null,
          num_guests: parseInt(formData.get('number_of_guests') as string) || 1,
          organization_id: organizationId,
          commission_amount: null,
          commission_rate: null,
          commission_calculated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (insertError) {
        console.error('Erro de inserção na tabela reservations:', insertError)
        throw insertError
      }

      // Sincronizar com plataformas (fire-and-forget, não bloqueia navegação)
      if (data?.id) {
        fetch('/api/reservations/sync-to-platforms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reservation_id: data.id }),
        }).catch(err => console.error('Erro ao sincronizar com plataformas:', err))

        // Notificar proprietário (fire-and-forget, não bloqueia navegação)
        fetch('/api/notifications/owner-reservation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reservation_id: data.id }),
        }).catch(err => console.error('Erro ao notificar proprietário:', err))
      }

      toast.success('Reserva criada com sucesso!')
      router.push('/reservations')
      router.refresh()
    } catch (err: unknown) {
      console.error('Erro detalhado ao criar reserva:', err)
      const errObj = err as any
      const message = errObj?.message || (err instanceof Error ? err.message : 'Erro ao criar reserva')
      const details = errObj?.details || errObj?.hint || ''
      setError(details ? `${message} (${details})` : message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link
          href={`${prefix}/reservations`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Reservas
        </Link>

        {/* Page Header */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Nova Reserva</h2>
          <p className="text-gray-600 mt-1">
            Crie uma reserva manual no sistema
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
          {/* Propriedade */}
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
                      {propertyListings.map((listing) => {
                        const platformName = (listing.platforms as { display_name?: string } | null)?.display_name || 'Desconhecido'
                        const listingId = listing.external_listing_id || listing.id.slice(0, 8)
                        return (
                          <SelectItem key={listing.id} value={listing.id}>
                            {platformName} - Anúncio #{listingId}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Se não houver anúncios, crie um primeiro na página de propriedades
                  </p>
                </div>
              )}

              {selectedProperty && propertyListings.length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Esta propriedade não possui anúncios cadastrados. Crie um anúncio primeiro ou escolha outra propriedade.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Datas */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Período da Reserva
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="check_in" className="mb-1">
                  Check-in *
                </Label>
                <Input
                  type="date"
                  id="check_in"
                  name="check_in"
                  required
                  defaultValue={preCheckIn}
                  min={preCheckIn ? undefined : new Date().toISOString().split('T')[0]}
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
                  defaultValue={preCheckOut}
                  min={preCheckOut ? undefined : new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          </div>

          {/* Hóspede */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Informações do Hóspede
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="guest_first_name" className="mb-1">
                    Nome *
                  </Label>
                  <Input
                    type="text"
                    id="guest_first_name"
                    name="guest_first_name"
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
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="guest_email" className="mb-1">
                    Email *
                  </Label>
                  <Input
                    type="email"
                    id="guest_email"
                    name="guest_email"
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
                  defaultValue="1"
                  required
                />
              </div>
            </div>
          </div>

          {/* Valor */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Valor da Reserva
            </h3>
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
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">
                Opcional - pode ser preenchido depois
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={loading || !selectedProperty || !selectedListing || propertyListings.length === 0}
              className="flex-1"
            >
              {loading ? (
                <>Criando...</>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Criar Reserva
                </>
              )}
            </Button>
            <Button variant="outline" asChild>
              <Link href={`${prefix}/reservations`}>
                Cancelar
              </Link>
            </Button>
          </div>
        </form>
      </main>
    </AuthLayout>
  )
}
