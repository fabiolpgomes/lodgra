import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, User, MapPin, DollarSign } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getUserAccess } from '@/lib/auth/getUserAccess'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { Button } from '@/components/common/ui/button'
import { Badge } from '@/components/common/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import { EditReservationClient } from '@/components/features/reservations/EditReservationClient'
import { ReservationUI } from '@/components/features/reservations/types/reservation-ui'
import { PremiumCard } from '@/components/common/layout/PremiumPage'

export default async function ReservationDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const resolvedLocale = locale
  const supabase = await createClient()
  const access = await getUserAccess(supabase)

  if (!access) {
    redirect('/login')
  }

  // Fetch reservation (simple query)
  const { data: reservation, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !reservation) {
    redirect(`/${locale}/reservations`)
  }

  // Fetch related property, listings, and channel info in parallel
  const [propertiesResult, listingsResult, channelResult] = await Promise.all([
    supabase.from('properties').select('*').eq('id', reservation.property_id),
    supabase.from('property_listings').select('*').eq('property_id', reservation.property_id),
    reservation.channel_connection_id ? supabase.from('channel_connections').select('channel, account_name').eq('id', reservation.channel_connection_id) : Promise.resolve({ data: null }),
  ])

  const property = propertiesResult.data?.[0]
  const listing = listingsResult.data?.[0]
  const channel = Array.isArray(channelResult.data) ? channelResult.data[0] : channelResult.data
  const rawPlatforms = listing?.platforms
  const platforms = Array.isArray(rawPlatforms) ? rawPlatforms[0] : rawPlatforms

  // Transform data to match ReservationUI interface
  const transformedReservation: ReservationUI = {
    id: reservation.id,
    check_in: reservation.check_in,
    check_out: reservation.check_out,
    status: (reservation.reservation_status as any) || 'pending',
    total_price: reservation.total_price,
    currency: reservation.currency,
    guest_name: reservation.guest_name,
    guest_email: reservation.guest_email,
    guest_phone: reservation.guest_phone,
    property_id: reservation.property_id,
    properties: property,
    property_listings: listing ? {
      id: listing.id,
      properties: property,
      platforms: platforms || null,
    } : undefined,
  }

  // Status configuration
  const statusConfig = {
    pending: { label: 'Pendente', className: 'bg-brand-gold/10 text-brand-gold' },
    confirmed: { label: 'Confirmada', className: 'bg-emerald-500/10 text-emerald-600' },
    cancelled: { label: 'Cancelada', className: 'bg-red-500/10 text-red-600' },
    completed: { label: 'Concluída', className: 'bg-brand-bg text-brand-text-medium' },
  }

  const status = statusConfig[reservation.reservation_status as keyof typeof statusConfig] || statusConfig.pending
  const platformName = platforms?.display_name

  const checkInDate = new Date(reservation.check_in)
  const checkOutDate = new Date(reservation.check_out)
  const checkInFormatted = checkInDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const checkOutFormatted = checkOutDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const createdAtFormatted = new Date(reservation.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <AuthLayout profile={access.profile}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href={`/${locale}/reservations`}>
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2 text-brand-text-dark" />
              Voltar para Reservas
            </Button>
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-brand-text-dark">Detalhes da Reserva</h1>
              <p className="text-sm text-brand-text-medium mt-1">ID: {reservation.id}</p>
            </div>
            <Badge className={`${status.className} text-sm px-3 py-1`}>
              {status.label}
            </Badge>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="md:col-span-2 space-y-6">
            {/* Property Card */}
            <div className="bg-white rounded-lg border border-brand-border p-6">
              <h2 className="text-lg font-semibold text-brand-text-dark mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-brand-text-medium" />
                Propriedade
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-brand-text-medium">Nome</p>
                  <p className="text-base font-medium text-brand-text-dark">{property?.name || '-'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-brand-text-medium">Cidade</p>
                    <p className="text-base font-medium text-brand-text-dark">{property?.city || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-brand-text-medium">País</p>
                    <p className="text-base font-medium text-brand-text-dark">{property?.country || '-'}</p>
                  </div>
                </div>
                {platformName && (
                  <div>
                    <p className="text-sm text-brand-text-medium">Plataforma</p>
                    <p className="inline-block px-2 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded">
                      {platformName}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Guest Info Card */}
            <div className="bg-white rounded-lg border border-brand-border p-6">
              <h2 className="text-lg font-semibold text-brand-text-dark mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-brand-text-medium" />
                Hóspede
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-brand-text-medium">Nome</p>
                  <p className="text-base font-medium text-brand-text-dark">
                    {reservation.guest_name || `${reservation.first_name || ''} ${reservation.last_name || ''}`.trim() || '-'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-brand-text-medium">Email</p>
                    <p className="text-sm text-brand-text-dark break-all">{reservation.guest_email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-brand-text-medium">Telefone</p>
                    <p className="text-sm text-brand-text-dark">{reservation.guest_phone || '-'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-brand-text-medium">Número de Hóspedes</p>
                  <p className="text-base font-medium text-brand-text-dark">{reservation.number_of_guests || '-'}</p>
                </div>
              </div>
            </div>

            {/* Dates Card */}
            <div className="bg-white rounded-lg border border-brand-border p-6">
              <h2 className="text-lg font-semibold text-brand-text-dark mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-brand-text-medium" />
                Período da Reserva
              </h2>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-brand-text-medium">Check-in</p>
                    <p className="text-base font-medium text-brand-text-dark">{checkInFormatted}</p>
                  </div>
                  <div>
                    <p className="text-sm text-brand-text-medium">Check-out</p>
                    <p className="text-base font-medium text-brand-text-dark">{checkOutFormatted}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-brand-text-medium">Número de Noites</p>
                  <p className="text-base font-medium text-brand-text-dark">{reservation.number_of_nights || '-'}</p>
                </div>
              </div>
            </div>

            {/* Reservation Info Card */}
            <div className="bg-white rounded-lg border border-brand-border p-6">
              <h2 className="text-lg font-semibold text-brand-text-dark mb-4">Informações da Reserva</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-brand-text-medium">Número da Reserva</p>
                  <p className="text-base font-mono text-brand-text-dark bg-brand-bg p-2 rounded">{reservation.external_reservation_id || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-brand-text-medium">Plataforma</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded">
                      {channel?.channel ? channel.channel.toUpperCase() : 'MANUAL'}
                    </span>
                    {channel?.account_name && (
                      <span className="text-sm text-brand-text-medium">({channel.account_name})</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Notes Card */}
            <div className="bg-white rounded-lg border border-brand-border p-6">
              <h2 className="text-lg font-semibold text-brand-text-dark mb-4">Notas</h2>
              <p className="text-sm text-brand-text-dark bg-brand-bg p-3 rounded border border-brand-border min-h-20">
                {reservation.notes || <span className="text-brand-text-medium italic">Sem notas</span>}
              </p>
              <p className="text-xs text-brand-text-medium mt-2">{(reservation.notes || '').length}/200 caracteres</p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="md:col-span-1 space-y-6">
            {/* Price Card */}
            <div className="bg-white rounded-lg border border-brand-border p-6">
              <h2 className="text-lg font-semibold text-brand-text-dark mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-brand-text-medium" />
                Valor
              </h2>
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(reservation.total_price || 0, (reservation.currency || 'EUR') as any)}
              </div>
            </div>

            {/* Status Card */}
            <div className="bg-white rounded-lg border border-brand-border p-6">
              <h2 className="text-lg font-semibold text-brand-text-dark mb-4">Status</h2>
              <div className="mb-4">
                <Badge className={`${status.className} text-sm px-3 py-1 w-full text-center justify-center`}>
                  {status.label}
                </Badge>
              </div>
              <div className="text-sm text-brand-text-medium">
                <p className="font-medium text-gray-900">Criada em:</p>
                <p>{createdAtFormatted}</p>
              </div>
            </div>

            {/* Actions */}
            <EditReservationClient reservation={transformedReservation} locale={resolvedLocale} />
          </div>
        </div>
      </div>
    </AuthLayout>
  )
}
