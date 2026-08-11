import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, User, MapPin, DollarSign } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getUserAccess } from '@/lib/auth/getUserAccess'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { Button } from '@/components/common/ui/button'
import { Badge } from '@/components/common/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'

export default async function ReservationDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const supabase = await createClient()
  const access = await getUserAccess(supabase)

  if (!access) {
    redirect('/login')
  }

  // Fetch reservation with all related data
  const { data: reservation, error } = await supabase
    .from('reservations')
    .select(`
      id,
      guest_name,
      first_name,
      last_name,
      guest_email,
      guest_phone,
      check_in,
      check_out,
      number_of_nights,
      number_of_guests,
      total_price,
      currency,
      reservation_status,
      created_at,
      property_listings!inner(
        id,
        properties!inner(
          id,
          name,
          city,
          country,
          currency
        ),
        platforms(
          display_name
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error || !reservation) {
    redirect(`/${locale}/reservations`)
  }

  // Status configuration
  const statusConfig = {
    pending: { label: 'Pendente', className: 'bg-orange-100 text-orange-800' },
    confirmed: { label: 'Confirmada', className: 'bg-green-100 text-green-800' },
    cancelled: { label: 'Cancelada', className: 'bg-red-100 text-red-800' },
    completed: { label: 'Concluída', className: 'bg-gray-100 text-gray-800' },
  }

  const status = statusConfig[reservation.reservation_status as keyof typeof statusConfig] || statusConfig.pending

  // Extract property data
  const rawListing = reservation.property_listings
  const listing = Array.isArray(rawListing) ? rawListing[0] : rawListing
  const rawProperty = listing?.properties
  const property = Array.isArray(rawProperty) ? rawProperty[0] : rawProperty
  const rawPlatforms = listing?.platforms
  const platforms = Array.isArray(rawPlatforms) ? rawPlatforms[0] : rawPlatforms
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
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Reservas
            </Button>
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Detalhes da Reserva</h1>
              <p className="text-sm text-gray-600 mt-1">ID: {reservation.id}</p>
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
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-gray-600" />
                Propriedade
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Nome</p>
                  <p className="text-base font-medium text-gray-900">{property?.name || '-'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Cidade</p>
                    <p className="text-base font-medium text-gray-900">{property?.city || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">País</p>
                    <p className="text-base font-medium text-gray-900">{property?.country || '-'}</p>
                  </div>
                </div>
                {platformName && (
                  <div>
                    <p className="text-sm text-gray-600">Plataforma</p>
                    <p className="inline-block px-2 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded">
                      {platformName}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Guest Info Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-gray-600" />
                Hóspede
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Nome</p>
                  <p className="text-base font-medium text-gray-900">
                    {reservation.guest_name || `${reservation.first_name || ''} ${reservation.last_name || ''}`.trim() || '-'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="text-sm text-gray-900 break-all">{reservation.guest_email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Telefone</p>
                    <p className="text-sm text-gray-900">{reservation.guest_phone || '-'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Número de Hóspedes</p>
                  <p className="text-base font-medium text-gray-900">{reservation.number_of_guests || '-'}</p>
                </div>
              </div>
            </div>

            {/* Dates Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-600" />
                Período da Reserva
              </h2>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Check-in</p>
                    <p className="text-base font-medium text-gray-900">{checkInFormatted}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Check-out</p>
                    <p className="text-base font-medium text-gray-900">{checkOutFormatted}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Número de Noites</p>
                  <p className="text-base font-medium text-gray-900">{reservation.number_of_nights || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="md:col-span-1 space-y-6">
            {/* Price Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-gray-600" />
                Valor
              </h2>
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(reservation.total_price || 0, (reservation.currency || 'EUR') as any)}
              </div>
            </div>

            {/* Status Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Status</h2>
              <div className="mb-4">
                <Badge className={`${status.className} text-sm px-3 py-1 w-full text-center justify-center`}>
                  {status.label}
                </Badge>
              </div>
              <div className="text-sm text-gray-600">
                <p className="font-medium text-gray-900">Criada em:</p>
                <p>{createdAtFormatted}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Ações</h2>
              <div className="space-y-2">
                <Button className="w-full" variant="outline" disabled>
                  Editar Reserva
                </Button>
                <Button className="w-full" variant="outline" disabled>
                  Cancelar Reserva
                </Button>
                <Button className="w-full" variant="outline" disabled>
                  Enviar Mensagem
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  )
}
