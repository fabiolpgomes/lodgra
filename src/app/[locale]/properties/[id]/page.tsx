import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MapPin, Users, Bed, Bath, Home, Edit, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { DeletePropertyButton } from '@/components/features/properties/DeletePropertyButton'
import { TogglePropertyStatusButton } from '@/components/features/properties/TogglePropertyStatusButton'
import { PropertyListingsManager } from '@/components/features/listings/PropertyListingsManager'
import { QuickActionButtons } from '@/components/features/properties/QuickActionButtons'
import { ICalExportCard } from '@/components/features/properties/ICalExportCard'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { getUserRole } from '@/lib/auth/getUserRole'
import { Button } from '@/components/common/ui/button'
import { Badge } from '@/components/common/ui/badge'

export default async function PropertyDetailsPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const userRole = await getUserRole(supabase)
  const canEdit = userRole === 'admin' || userRole === 'gestor'
  const canDelete = userRole === 'admin'

  // Buscar propriedade específica
  const { data: property, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !property) {
    notFound()
  }

  // Buscar listings desta propriedade
  const { data: listings } = await supabase
    .from('property_listings')
    .select('id')
    .eq('property_id', id)

  const listingIds = (listings || []).map((l) => l.id)

  // Buscar reservas (via property_listings)
  let reservations: { id: string; check_in: string; check_out: string; total_amount: string | null; currency: string | null; status: string }[] = []
  if (listingIds.length > 0) {
    const { data } = await supabase
      .from('reservations')
      .select('id, check_in, check_out, total_amount, currency, status')
      .in('property_listing_id', listingIds)
      .neq('status', 'cancelled')
    reservations = data || []
  }

  // Calcular estatísticas
  const totalReservations = reservations.length
  const totalRevenue = reservations.reduce((sum: number, r) => sum + (parseFloat(r.total_amount ?? '0') || 0), 0)

  // Taxa de ocupação (últimos 365 dias)
  const now = new Date()
  const oneYearAgo = new Date(now)
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
  const totalDays = 365

  let occupiedDays = 0
  reservations.forEach((r) => {
    const checkIn = new Date(r.check_in)
    const checkOut = new Date(r.check_out)
    // Limitar ao intervalo do último ano
    const start = checkIn < oneYearAgo ? oneYearAgo : checkIn
    const end = checkOut > now ? now : checkOut
    if (start < end) {
      occupiedDays += Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    }
  })
  const occupancyRate = totalDays > 0 ? Math.min(Math.round((occupiedDays / totalDays) * 100), 100) : 0

  // Buscar total de despesas
  const { data: expensesData } = await supabase
    .from('expenses')
    .select('amount')
    .eq('property_id', id)

  const totalExpenses = (expensesData || []).reduce((sum: number, e) => sum + (parseFloat(e.amount) || 0), 0)

  // Moeda da propriedade
  const currency = property.currency || 'EUR'
  const currencySymbol = currency === 'BRL' ? 'R$' : currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '€'

  // Buscar proprietário associado
  let owner = null
  if (property.owner_id) {
    const { data } = await supabase
      .from('owners')
      .select('id, full_name, email, phone')
      .eq('id', property.owner_id)
      .single()
    owner = data
  }

  return (
    <AuthLayout>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <Link href="/" className="hover:text-gray-900">Dashboard</Link>
          <span>/</span>
          <Link href="/properties" className="hover:text-gray-900">Propriedades</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">{property.name}</span>
        </div>

        {/* Back Button */}
        <Link
          href="/properties"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Propriedades
        </Link>

        {/* Header com ações */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-3xl font-bold text-gray-900">{property.name}</h2>
              {property.is_active ? (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Ativo</Badge>
              ) : (
                <Badge variant="outline">Inativo</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="h-5 w-5" />
              <span>{property.city}, {property.country}</span>
            </div>
          </div>

          <div className="flex gap-3">
            {canEdit && (
              <Button asChild>
                <Link href={`/properties/${id}/edit`} className="flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  Editar
                </Link>
              </Button>
            )}
            {canEdit && (
              <TogglePropertyStatusButton
                propertyId={id}
                propertyName={property.name}
                isActive={property.is_active}
              />
            )}
            {canDelete && (
              <DeletePropertyButton
                propertyId={id}
                propertyName={property.name}
              />
            )}
          </div>
        </div>

        {/* Grid de Informações */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Informações Principais */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card de Informações Básicas */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Informações Básicas
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Tipo de Propriedade</p>
                  <p className="font-medium text-gray-900 capitalize">
                    {property.property_type || 'Não especificado'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Status</p>
                  <p className="font-medium text-gray-900">
                    {property.is_active ? 'Ativa' : 'Inativa'}
                  </p>
                </div>
              </div>
            </div>

            {/* Card de Localização */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Localização
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Endereço Completo</p>
                  <p className="font-medium text-gray-900">{property.address}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Cidade</p>
                    <p className="font-medium text-gray-900">{property.city}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">País</p>
                    <p className="font-medium text-gray-900">{property.country}</p>
                  </div>
                </div>
                {property.postal_code && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Código Postal</p>
                    <p className="font-medium text-gray-900">{property.postal_code}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Card de Capacidade */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Home className="h-5 w-5" />
                Capacidade e Comodidades
              </h3>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Bed className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{property.bedrooms || 0}</p>
                  <p className="text-sm text-gray-600">Quartos</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Bath className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{property.bathrooms || 0}</p>
                  <p className="text-sm text-gray-600">Casas de Banho</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{property.max_guests || 0}</p>
                  <p className="text-sm text-gray-600">Hóspedes</p>
                </div>
              </div>
            </div>

            {/* Anúncios */}
            <PropertyListingsManager propertyId={id} />

            {/* iCal Export */}
            <ICalExportCard
              propertyId={id}
              appUrl={process.env.NEXT_PUBLIC_APP_URL || 'https://lodgra.pt'}
            />
          </div>

          {/* Sidebar de Resumo */}
          <div className="space-y-6">
            {/* Card de Proprietário */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Proprietário
              </h3>
              {owner ? (
                <div className="space-y-2">
                  <Link
                    href={`/owners/${owner.id}`}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {owner.full_name}
                  </Link>
                  {owner.email && (
                    <p className="text-sm text-gray-600">{owner.email}</p>
                  )}
                  {owner.phone && (
                    <p className="text-sm text-gray-600">{owner.phone}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Nenhum proprietário atribuído</p>
              )}
            </div>

            {/* Card de Estatísticas */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Estatísticas
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm text-gray-600">Reservas Totais</span>
                  <span className="text-xl font-bold text-blue-600">{totalReservations}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm text-gray-600">Taxa de Ocupação</span>
                  <span className="text-xl font-bold text-green-600">{occupancyRate}%</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <span className="text-sm text-gray-600">Receita Total</span>
                  <span className="text-xl font-bold text-purple-600">
                    {currencySymbol}{totalRevenue.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <span className="text-sm text-gray-600">Despesas Total</span>
                  <span className="text-xl font-bold text-red-600">
                    {currencySymbol}{totalExpenses.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Card de Ações Rápidas */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Ações Rápidas
              </h3>
              <QuickActionButtons propertyId={id} />
            </div>

            {/* Card de Informações do Sistema */}
            <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-600">
              <p className="mb-1">
                <strong>ID:</strong> {property.id}
              </p>
              <p className="mb-1">
                <strong>Criado em:</strong>{' '}
                {new Date(property.created_at).toLocaleDateString('pt-BR')}
              </p>
              <p>
                <strong>Atualizado em:</strong>{' '}
                {new Date(property.updated_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        </div>
      </main>
    </AuthLayout>
  )
}
