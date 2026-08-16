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
import { getCurrencySymbol, type CurrencyCode } from '@/lib/utils/currency'
import { getPlatformPrefix, buildExternalId } from '@/lib/utils/platform-mapping'
import { calculateServiceFeeAmount, nightsBetween } from '@/lib/reservations/serviceFee'
import type { ValidationResult } from '@/lib/reservations/reservation-validator'

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
  const [properties, setProperties] = useState<{ id: string; name: string; currency: string; city?: string | null; min_nights: number; cleaning_fee?: number | null; cleaning_fee_type?: string | null; pet_fee?: number | null; pet_fee_type?: string | null }[]>([])
  const [propertyListings, setPropertyListings] = useState<{ id: string; property_id: string; external_listing_id?: string | null; platforms: { display_name: string } | null }[]>([])
  const [selectedProperty, setSelectedProperty] = useState(prePropertyId)
  const [selectedListing, setSelectedListing] = useState('')
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null)
  const [priceCalculating, setPriceCalculating] = useState(false)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [checkIn, setCheckIn] = useState(preCheckIn)
  const [checkOut, setCheckOut] = useState(preCheckOut)

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
        setSelectedPlatform(null)
      }

      loadListings()
    } else {
      setPropertyListings([])
      setSelectedListing('')
      setSelectedPlatform(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProperty])

  // Detectar plataforma quando selectedListing muda
  useEffect(() => {
    if (selectedListing && propertyListings.length > 0) {
      const listing = propertyListings.find(l => l.id === selectedListing)
      if (listing) {
        const platformName = (listing.platforms as { display_name?: string } | null)?.display_name || ''
        setSelectedPlatform(platformName)
      }
    } else {
      setSelectedPlatform(null)
    }
  }, [selectedListing, propertyListings])
  // Validate the property's calendar rules before showing a price. This is
  // the single source of truth for availability, base price, discounts,
  // fees and cancellation policy.
  useEffect(() => {
    async function validateReservation() {
      if (!checkIn || !checkOut || !selectedProperty) {
        setCalculatedPrice(null)
        setValidationResult(null)
        return
      }

      setPriceCalculating(true)
      try {
        const response = await fetch('/api/admin/reservations/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            propertyId: selectedProperty,
            checkIn,
            checkOut,
          }),
        })

        const data = await response.json() as ValidationResult & { error?: string }
        if (!response.ok) throw new Error(data.error || 'Não foi possível validar a reserva')
        setValidationResult(data)
        setCalculatedPrice(data.finalPrice)
      } catch (err) {
        console.error('Erro ao calcular preço:', err)
        setValidationResult(null)
        setCalculatedPrice(null)
      } finally {
        setPriceCalculating(false)
      }
    }

    validateReservation()
  }, [checkIn, checkOut, selectedProperty])

  const canCreateReservation = validationResult?.success === true && !loading && !priceCalculating
  const availabilityBlocked = validationResult?.errors.some((item) =>
    item.toLowerCase().includes('overlapping')
  ) ?? false


  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    // Validação: propriedade obrigatória (anúncio é opcional para reservas manuais)
    if (!selectedProperty) {
      setError('Seleccione a propriedade')
      setLoading(false)
      return
    }

    const checkInStr = checkIn
    const checkOutStr = checkOut

    // A validação acima pode ter sido feita antes de outra reserva/bloqueio.
    // Revalidar no submit evita criar uma reserva com preço ou disponibilidade
    // desatualizados.
    let validatedPrice: number | null = null
    try {
      const validationResponse = await fetch('/api/admin/reservations/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: selectedProperty,
          checkIn: checkInStr,
          checkOut: checkOutStr,
        }),
      })

      const latestValidation = await validationResponse.json() as ValidationResult & { error?: string }
      if (!validationResponse.ok) {
        setError(`Erro ao validar reserva: ${latestValidation.error || 'resposta inválida'}`)
        setLoading(false)
        return
      }

      setValidationResult(latestValidation)
      setCalculatedPrice(latestValidation.finalPrice)
      validatedPrice = latestValidation.finalPrice
      if (!latestValidation.success) {
        setError(latestValidation.errors.join('\n'))
        setLoading(false)
        return
      }
    } catch (err) {
      console.error('Erro ao verificar disponibilidade:', err)
      setError('Erro ao validar disponibilidade e preço. Tente novamente.')
      setLoading(false)
      return
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

      // Buscar dados da propriedade
      let propertyId = selectedProperty
      let propertyCurrency = 'EUR'

      if (selectedProperty) {
        const { data: prop } = await supabase
          .from('properties')
          .select('id, currency')
          .eq('id', selectedProperty)
          .single()

        if (!prop) {
          throw new Error('Propriedade não encontrada')
        }

        propertyId = prop.id
        propertyCurrency = prop.currency || 'EUR'
      }

      // Criar reserva
      const reservationNumber = (formData.get('reservation_number') as string)?.trim()
      let externalId: string | null = null
      if (reservationNumber && selectedPlatform) {
        externalId = buildExternalId(reservationNumber, selectedPlatform)
        console.log(`[Reservation] External ID gerado: ${externalId}`)
      }

      // Story 39.1 — snapshot de service_fee_amount a partir da propriedade selecionada
      const selectedPropertyData = properties.find(p => p.id === selectedProperty)
      const nights = nightsBetween(checkInStr, checkOutStr)
      const serviceFeeAmount = calculateServiceFeeAmount(selectedPropertyData, nights)

      // Try to get active channel connection for this organization
      let { data: channelConn } = await supabase
        .from('channel_connections')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle()

      // Fallback: try to get ANY active channel connection (for development/testing)
      if (!channelConn?.id) {
        const { data: anyChannel } = await supabase
          .from('channel_connections')
          .select('id')
          .eq('status', 'active')
          .limit(1)
          .maybeSingle()

        channelConn = anyChannel
      }

      if (!channelConn?.id) {
        throw new Error('Nenhum canal de conexão ativo encontrado na organização ou no sistema. Configure um canal (Booking.com, Airbnb, etc)')
      }

      const reservationData: Record<string, any> = {
        organization_id: organizationId,
        property_id: propertyId,
        channel_connection_id: channelConn.id, // Use organization channel or any available channel
        external_reservation_id: externalId || `manual-${Date.now()}`, // Use provided ID or generate one
        check_in: checkInStr,
        check_out: checkOutStr,
        number_of_guests: parseInt(formData.get('number_of_guests') as string) || 1,
        adults: parseInt(formData.get('adults') as string) || 1,
        children: parseInt(formData.get('children') as string) || 0,
        total_price: validatedPrice ?? calculatedPrice,
        currency: propertyCurrency,
        reservation_status: 'confirmed',
        guest_name: (formData.get('guest_first_name') as string) + ' ' + (formData.get('guest_last_name') as string),
        guest_email: formData.get('guest_email') as string,
        guest_phone: (formData.get('guest_phone') as string) || null,
      }

      const { data, error: insertError } = await supabase
        .from('reservations')
        .insert(reservationData)
        .select()
        .single()

      if (insertError) {
        console.error('Erro de inserção na tabela reservations:', insertError)
        throw insertError
      }

      // Sincronizar com plataformas (aguarda resposta antes de navegar)
      if (data?.id) {
        try {
          await fetch('/api/reservations/sync-to-platforms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reservation_id: data.id }),
          })
        } catch (err) {
          console.error('Erro ao sincronizar com plataformas:', err)
        }

        // Notificar proprietário (aguarda resposta antes de navegar)
        try {
          await fetch('/api/notifications/owner-reservation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reservation_id: data.id }),
          })
        } catch (err) {
          console.error('Erro ao notificar proprietário:', err)
        }

        // Enviar email de confirmação ao hóspede (aguarda resposta antes de navegar)
        try {
          await fetch('/api/email/send-confirmation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reservationId: data.id }),
          })
        } catch (err) {
          console.error('Erro ao enviar email de confirmação:', err)
        }
      }

      toast.success('Reserva criada com sucesso!')
      router.push('/reservations')
      router.refresh()
    } catch (err: unknown) {
      console.error('Erro detalhado ao criar reserva:', err)
      const errObj = err as { message?: string; details?: string; hint?: string } | null
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
                  <p className="text-xs text-gray-600 mt-1">
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
                  Check-in * <span className="text-xs text-gray-600">(dd/mm/aaaa)</span>
                </Label>
                <Input
                  type="date"
                  id="check_in"
                  name="check_in"
                  required
                  value={checkIn}
                  onChange={(event) => setCheckIn(event.target.value)}
                  min={preCheckIn ? undefined : new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <Label htmlFor="check_out" className="mb-1">
                  Check-out * <span className="text-xs text-gray-600">(dd/mm/aaaa)</span>
                </Label>
                <Input
                  type="date"
                  id="check_out"
                  name="check_out"
                  required
                  value={checkOut}
                  onChange={(event) => setCheckOut(event.target.value)}
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
                    Email
                  </Label>
                  <Input
                    type="email"
                    id="guest_email"
                    name="guest_email"
                    placeholder="Opcional - deixe em branco se não tiver email"
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="adults" className="mb-1">
                    Adultos *
                  </Label>
                  <Input
                    type="number"
                    id="adults"
                    name="adults"
                    min="1"
                    defaultValue="1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="children" className="mb-1">
                    Crianças (até 12 anos)
                  </Label>
                  <Input
                    type="number"
                    id="children"
                    name="children"
                    min="0"
                    defaultValue="0"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes" className="mb-1">
                  Notas
                </Label>
                <Input
                  type="text"
                  id="notes"
                  name="notes"
                  placeholder="Observações internas sobre a reserva..."
                />
              </div>
            </div>
          </div>

          {/* Identificador Externo */}
          {selectedListing && selectedPlatform && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Prevenção de Duplicação
              </h3>
              <div>
                <Label htmlFor="reservation_number" className="mb-1">
                  Número da Reserva <span className="text-xs text-gray-500">({selectedPlatform})</span>
                </Label>
                <Input
                  type="text"
                  id="reservation_number"
                  name="reservation_number"
                  placeholder={`Ex: 6816972454 (será salvo como ${getPlatformPrefix(selectedPlatform)}_______)`}
                />
                <p className="text-xs text-gray-600 mt-2">
                  Preencha com o número da reserva da {selectedPlatform}. Isto previne duplicações automáticas na próxima sincronização iCal.
                  Você pode encontrar este número na confirmação de reserva da plataforma.
                </p>
              </div>
            </div>
          )}

          {/* Valor */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Valor da Reserva
            </h3>
            <div>
              <Label htmlFor="total_amount" className="mb-1">
                Valor Total ({getCurrencySymbol((properties.find(p => p.id === selectedProperty)?.currency || 'EUR') as CurrencyCode)})
              </Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  id="total_amount"
                  name="total_amount"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={calculatedPrice ?? ''}
                  readOnly
                  className={calculatedPrice
                    ? validationResult?.success
                      ? 'bg-emerald-50 border-emerald-300'
                      : 'bg-red-50 border-red-300'
                    : ''}
                />
                {priceCalculating && (
                  <div className="flex items-center gap-1 text-sm text-blue-600 animate-pulse">
                    <div className="animate-spin">⟳</div>
                    <span>Calculando...</span>
                  </div>
                )}
              </div>
              {validationResult ? (
                <div className={`${validationResult.success ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'} border rounded px-3 py-2 mt-2`}>
                  <p className={`text-sm font-semibold ${validationResult.success ? 'text-emerald-800' : 'text-red-800'}`}>
                    {validationResult.success ? '✓' : '⚠️'} Total calculado: {getCurrencySymbol((properties.find(p => p.id === selectedProperty)?.currency || 'EUR') as CurrencyCode)}{validationResult.finalPrice.toFixed(2)}
                  </p>
                  <div className="mt-2 text-xs text-gray-700 space-y-1">
                    <p>
                      Preço por noite: {(validationResult.nights > 0 ? validationResult.price.subtotal / validationResult.nights : 0).toFixed(2)} × {validationResult.nights} noites = {validationResult.price.subtotal.toFixed(2)}
                    </p>
                    <p>Desconto: {validationResult.discount.hasDiscount ? `-${(validationResult.discount.originalPrice - validationResult.discount.discountedPrice).toFixed(2)} (${validationResult.discount.discountPercentage}%)` : 'Nenhum desconto aplicável'}</p>
                    <p>Taxas: {validationResult.fees.totalFees.toFixed(2)}</p>
                    <p className={validationResult.minimumNights.passed ? '' : 'font-semibold text-red-700'}>
                      Estadia mínima: {validationResult.minimumNights.minimumNights} noites
                      {' · '}selecionadas: {validationResult.minimumNights.selectedNights}
                    </p>
                    <p>Disponibilidade: {availabilityBlocked ? 'Indisponível' : 'Disponível'}</p>
                    <p>Política: {validationResult.cancellationPolicy.success ? validationResult.cancellationPolicy.policyName : 'Não configurada'}</p>
                  </div>
                  {!validationResult.success && (
                    <p className="mt-2 text-xs font-medium text-red-700">
                      Corrija os problemas acima antes de criar a reserva.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-600 mt-1">
                  Seleccione datas e propriedade para auto-calcular
                </p>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={!canCreateReservation}
              className="flex-1"
            >
              {loading ? (
                <>Criando...</>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  {validationResult?.success === false ? 'Reserva bloqueada' : 'Criar Reserva'}
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
