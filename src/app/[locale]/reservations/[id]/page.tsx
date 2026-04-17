import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Calendar, Users, Mail, Phone, MapPin, CreditCard, Clock, ArrowLeft, Edit, Building2, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CancelReservationButton } from '@/components/features/reservations/CancelReservationButton'
import { DeleteReservationButton } from '@/components/features/reservations/DeleteReservationButton'
import { InternalNotes } from '@/components/features/reservations/InternalNotes'
import { PrintReservationButton } from '@/components/features/reservations/PrintReservationButton'
import { formatCurrency } from '@/lib/utils/currency'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { getUserRole } from '@/lib/auth/getUserRole'
import { Button } from '@/components/common/ui/button'

export default async function ReservationDetailsPage({
  params
}: {
  params: Promise<{ id: string, locale: string }>
}) {
  const { id, locale } = await params
  const prefix = `/${locale}`
  const supabase = await createClient()
  const userRole = await getUserRole(supabase)
  const canEdit = userRole === 'admin' || userRole === 'gestor'
  const canDelete = userRole === 'admin'

  // Buscar reserva com todas as informações relacionadas
  const { data: reservation, error } = await supabase
    .from('reservations')
    .select(`
      *,
      property_listings!inner(
        id,
        external_listing_id,
        properties!inner(
          id,
          name,
          address,
          city,
          country,
          property_type,
          bedrooms,
          bathrooms,
          max_guests
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

  if (error || !reservation) {
    notFound()
  }

  const property = reservation.property_listings?.properties
  const guest = reservation.guests

  // Calcular número de noites
  const checkIn = new Date(reservation.check_in)
  const checkOut = new Date(reservation.check_out)
  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))

  // Configuração de status
  const statusConfig = {
    pending: { label: 'Pendente', color: 'bg-orange-100 text-orange-800', icon: Clock },
    confirmed: { label: 'Confirmada', color: 'bg-green-100 text-green-800', icon: Calendar },
    cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-800', icon: Calendar },
    completed: { label: 'Concluída', color: 'bg-gray-100 text-gray-800', icon: Calendar },
  }

  const status = statusConfig[reservation.status as keyof typeof statusConfig] || statusConfig.pending
  const StatusIcon = status.icon

  return (
    <AuthLayout>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-6 no-print">
          <Link href={prefix} className="hover:text-gray-900">Dashboard</Link>
          <span>/</span>
          <Link href={`${prefix}/reservations`} className="hover:text-gray-900">Reservas</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Detalhes da Reserva</span>
        </div>

        {/* Back Button */}
        <Link
          href={`${prefix}/reservations`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 no-print"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Reservas
        </Link>

        {/* Header com Status e Ações */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Reserva #{reservation.confirmation_code || id.slice(0, 8).toUpperCase()}
                </h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`px-3 py-1 inline-flex items-center gap-1 text-sm font-semibold rounded-full ${status.color}`}>
                    <StatusIcon className="h-4 w-4" />
                    {status.label}
                  </span>
                  <span className="text-sm text-gray-600">
                    Criada em {new Date(reservation.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 no-print">
              <PrintReservationButton />
              {canEdit && (
                <Button asChild>
                  <Link href={`${prefix}/reservations/${id}/edit`}>
                    <Edit className="h-4 w-4" />
                    Editar
                  </Link>
                </Button>
              )}
              {canEdit && reservation.status !== 'cancelled' && (
                <CancelReservationButton
                  reservationId={id}
                  confirmationCode={reservation.confirmation_code || id.slice(0, 8).toUpperCase()}
                />
              )}
              {canDelete && (
                <DeleteReservationButton
                  reservationId={id}
                  confirmationCode={reservation.confirmation_code || id.slice(0, 8).toUpperCase()}
                />
              )}
            </div>
          </div>
        </div>

        {/* Grid de Conteúdo */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Datas da Reserva */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Período da Reserva
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Check-in</p>
                  <p className="text-xl font-bold text-gray-900">
                    {checkIn.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {checkIn.toLocaleDateString('pt-BR', { year: 'numeric' })}
                  </p>
                </div>

                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Duração</p>
                  <p className="text-xl font-bold text-gray-900">{nights}</p>
                  <p className="text-xs text-gray-500">
                    {nights === 1 ? 'noite' : 'noites'}
                  </p>
                </div>

                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Check-out</p>
                  <p className="text-xl font-bold text-gray-900">
                    {checkOut.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {checkOut.toLocaleDateString('pt-BR', { year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Propriedade */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Propriedade
              </h3>
              {property ? (
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <Link
                        href={`${prefix}/properties/${property.id}`}
                        className="text-xl font-semibold text-blue-600 hover:text-blue-700"
                      >
                        {property.name}
                      </Link>
                      <div className="flex items-center gap-2 text-gray-600 mt-1">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm">{property.address}</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {property.city}, {property.country}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full capitalize">
                      {property.property_type}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{property.bedrooms || 0}</p>
                      <p className="text-sm text-gray-600">Quartos</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{property.bathrooms || 0}</p>
                      <p className="text-sm text-gray-600">Casas de Banho</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{property.max_guests || 0}</p>
                      <p className="text-sm text-gray-600">Hóspedes</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Propriedade não encontrada</p>
              )}
            </div>

            {/* Hóspede */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Informações do Hóspede
              </h3>
              {guest ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-xl font-semibold text-gray-900">
                      {guest.first_name} {guest.last_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {reservation.number_of_guests} {reservation.number_of_guests === 1 ? 'hóspede' : 'hóspedes'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    {guest.email && (
                      <div className="flex items-center gap-2 text-gray-700">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <a href={`mailto:${guest.email}`} className="hover:text-blue-600">
                          {guest.email}
                        </a>
                      </div>
                    )}
                    {guest.phone && (
                      <div className="flex items-center gap-2 text-gray-700">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <a href={`tel:${guest.phone}`} className="hover:text-blue-600">
                          {guest.phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Hóspede não cadastrado</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Resumo Financeiro */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Resumo Financeiro
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Valor Total</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {formatCurrency(reservation.total_amount, reservation.currency || 'EUR')}
                  </span>
                </div>
                {reservation.total_amount && nights > 0 && (
                  <div className="flex justify-between items-center text-sm pt-3 border-t">
                    <span className="text-gray-600">Por noite</span>
                    <span className="text-gray-900 font-medium">
                      {formatCurrency(Number(reservation.total_amount) / nights, reservation.currency || 'EUR')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Moeda</span>
                  <span className="text-gray-900 font-medium">
                    {reservation.currency || 'EUR'}
                  </span>
                </div>
              </div>
            </div>

            {/* Informações Adicionais */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Informações Adicionais
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-600 mb-1">Origem</p>
                  <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium uppercase">
                    {reservation.source || 'Manual'}
                  </span>
                </div>
                {reservation.external_reservation_id && (
                  <div>
                    <p className="text-gray-600 mb-1">ID Externo</p>
                    <p className="text-gray-900 font-mono text-xs">
                      {reservation.external_reservation_id}
                    </p>
                  </div>
                )}
                <div className="pt-3 border-t">
                  <p className="text-gray-600 mb-1">Última Atualização</p>
                  <p className="text-gray-900">
                    {new Date(reservation.updated_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>

            {/* Ações Rápidas */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 no-print">
              <h4 className="font-semibold text-gray-900 mb-2">Ações Rápidas</h4>
              <div className="space-y-2 text-sm">
                <a
                  href={`mailto:${guest?.email || ''}?subject=${encodeURIComponent(`Confirmação de Reserva #${reservation.confirmation_code || id.slice(0, 8).toUpperCase()}`)}&body=${encodeURIComponent(
                    `Olá ${guest?.first_name || ''},\n\nConfirmamos a sua reserva:\n\n` +
                    `Reserva: #${reservation.confirmation_code || id.slice(0, 8).toUpperCase()}\n` +
                    `Propriedade: ${property?.name || 'N/A'}\n` +
                    `Check-in: ${checkIn.toLocaleDateString('pt-BR')}\n` +
                    `Check-out: ${checkOut.toLocaleDateString('pt-BR')}\n` +
                    `Noites: ${nights}\n` +
                    `Hóspedes: ${reservation.number_of_guests}\n` +
                    `Valor Total: ${reservation.total_amount ? `${reservation.total_amount} ${reservation.currency || 'EUR'}` : 'N/A'}\n\n` +
                    `Obrigado!`
                  )}`}
                  className="w-full flex items-center gap-2 px-3 py-2 text-blue-700 hover:bg-blue-100 rounded transition-colors"
                >
                  <Send className="h-4 w-4" />
                  Enviar confirmação por email
                </a>
                <Link
                  href={`${prefix}/calendar`}
                  className="w-full flex items-center gap-2 px-3 py-2 text-blue-700 hover:bg-blue-100 rounded transition-colors"
                >
                  <Calendar className="h-4 w-4" />
                  Ver no calendário
                </Link>
              </div>
            </div>

            {/* Nota Interna */}
            <div className="no-print">
            <InternalNotes
              reservationId={id}
              initialNotes={reservation.internal_notes}
            />
            </div>
          </div>
        </div>
      </main>
    </AuthLayout>
  )
}
