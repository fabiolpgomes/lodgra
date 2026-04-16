import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Edit, Users, MapPin, Building, CreditCard, Phone, Mail, FileText, Scale } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { DeleteOwnerButton } from '@/components/owners/DeleteOwnerButton'
import { AssignPropertyToOwner } from '@/components/owners/AssignPropertyToOwner'
import { getUserRole } from '@/lib/auth/getUserRole'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default async function OwnerDetailsPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const userRole = await getUserRole(supabase)
  const canEdit = userRole === 'admin' || userRole === 'gestor'
  const canDelete = userRole === 'admin'

  const { data: owner, error } = await supabase
    .from('owners')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !owner) {
    notFound()
  }

  // Buscar propriedades associadas
  const { data: properties } = await supabase
    .from('properties')
    .select('id, name, city, country, is_active')
    .eq('owner_id', id)
    .order('name')

  // Buscar utilizador vinculado
  let linkedUser = null
  if (owner.user_id) {
    const { data } = await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .eq('id', owner.user_id)
      .single()
    linkedUser = data
  }

  const showPT = owner.country === 'Portugal'
  const showBR = owner.country === 'Brasil'

  return (
    <AuthLayout>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <Link href="/" className="hover:text-gray-900">Dashboard</Link>
          <span>/</span>
          <Link href="/owners" className="hover:text-gray-900">Proprietários</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">{owner.full_name}</span>
        </div>

        <Link
          href="/owners"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Proprietários
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-3xl font-bold text-gray-900">{owner.full_name}</h2>
              {owner.is_active ? (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Ativo</Badge>
              ) : (
                <Badge variant="outline">Inativo</Badge>
              )}
            </div>
            {owner.city && (
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="h-5 w-5" />
                <span>{owner.city}, {owner.country}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            {canEdit && (
              <Button asChild variant="outline">
                <Link href={`/owners/${id}/fiscal`} className="flex items-center gap-2">
                  <Scale className="h-4 w-4" />
                  Relatório Fiscal
                </Link>
              </Button>
            )}
            {canEdit && (
              <Button asChild variant="outline">
                <Link href={`/owners/${id}/report`} className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Ver Relatório
                </Link>
              </Button>
            )}
            {canEdit && (
              <Button asChild>
                <Link href={`/owners/${id}/edit`} className="flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  Editar
                </Link>
              </Button>
            )}
            {canDelete && (
              <DeleteOwnerButton ownerId={id} ownerName={owner.full_name} />
            )}
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Dados Pessoais */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Dados Pessoais
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Nome Completo</p>
                  <p className="font-medium text-gray-900">{owner.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">NIF / CPF / CNPJ</p>
                  <p className="font-medium text-gray-900">{owner.tax_id || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Email</p>
                  <p className="font-medium text-gray-900 flex items-center gap-1">
                    {owner.email ? (
                      <><Mail className="h-4 w-4 text-gray-400" />{owner.email}</>
                    ) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Telefone</p>
                  <p className="font-medium text-gray-900 flex items-center gap-1">
                    {owner.phone ? (
                      <><Phone className="h-4 w-4 text-gray-400" />{owner.phone}</>
                    ) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Moeda Preferencial</p>
                  <p className="font-medium text-gray-900">{owner.preferred_currency || 'EUR'}</p>
                </div>
                {linkedUser && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Utilizador Vinculado</p>
                    <p className="font-medium text-blue-600">
                      {linkedUser.full_name || linkedUser.email}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Endereço */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Endereço
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <p className="text-sm text-gray-600 mb-1">Morada</p>
                  <p className="font-medium text-gray-900">{owner.address || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Cidade</p>
                  <p className="font-medium text-gray-900">{owner.city || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">País</p>
                  <p className="font-medium text-gray-900">{owner.country || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Código Postal</p>
                  <p className="font-medium text-gray-900">{owner.postal_code || '-'}</p>
                </div>
              </div>
            </div>

            {/* Dados Bancários */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Dados Bancários {showPT ? '— Portugal' : showBR ? '— Brasil' : ''}
              </h3>

              {showPT && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Banco</p>
                    <p className="font-medium text-gray-900">{owner.bank_name_pt || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">SWIFT / BIC</p>
                    <p className="font-medium text-gray-900">{owner.swift_code || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600 mb-1">IBAN</p>
                    <p className="font-medium text-gray-900 font-mono">{owner.iban || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">MBway</p>
                    <p className="font-medium text-gray-900">{owner.mbway_phone || '-'}</p>
                  </div>
                </div>
              )}

              {showBR && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Banco</p>
                    <p className="font-medium text-gray-900">{owner.bank_name_br || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Agência</p>
                    <p className="font-medium text-gray-900">{owner.agency_number || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Número da Conta</p>
                    <p className="font-medium text-gray-900">{owner.account_number || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Chave Pix</p>
                    <p className="font-medium text-gray-900">{owner.pix_key || '-'}</p>
                  </div>
                </div>
              )}

              {!showPT && !showBR && (
                <p className="text-gray-500 text-sm">Nenhum dado bancário registado.</p>
              )}
            </div>

            {/* Notas */}
            {owner.notes && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Observações</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{owner.notes}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Propriedades Associadas */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Building className="h-5 w-5" />
                Propriedades ({properties?.length || 0})
              </h3>
              {properties && properties.length > 0 ? (
                <div className="space-y-3">
                  {properties.map((prop) => (
                    <Link
                      key={prop.id}
                      href={`/properties/${prop.id}`}
                      className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <p className="font-medium text-gray-900">{prop.name}</p>
                      <p className="text-xs text-gray-500">{prop.city}, {prop.country}</p>
                      {!prop.is_active && (
                        <span className="text-xs text-gray-400">Inativa</span>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Nenhuma propriedade associada.</p>
              )}
              {canEdit && (
                <AssignPropertyToOwner ownerId={id} />
              )}
            </div>

            {/* Info do Sistema */}
            <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-600">
              <p className="mb-1">
                <strong>ID:</strong> {owner.id}
              </p>
              <p className="mb-1">
                <strong>Criado em:</strong>{' '}
                {new Date(owner.created_at).toLocaleDateString('pt-BR')}
              </p>
              <p>
                <strong>Atualizado em:</strong>{' '}
                {new Date(owner.updated_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        </div>
      </main>
    </AuthLayout>
  )
}
