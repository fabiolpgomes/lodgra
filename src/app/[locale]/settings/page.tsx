import { requireRole } from '@/lib/auth/requireRole'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { ICalSyncSettings } from '@/components/features/settings/ICalSyncSettings'
import { ICalExportSection } from '@/components/features/settings/ICalExportSection'
import { SettingsUserManagement } from '@/components/features/settings/SettingsUserManagement'
import { ChangePasswordSection } from '@/components/features/settings/ChangePasswordSection'
import { Building2, ExternalLink, Palette, Settings, Upload, Download, Users } from 'lucide-react'
import { ConsentManagement } from '@/components/features/settings/ConsentManagement'
import { DataExportSection } from '@/components/features/settings/DataExportSection'
import { AccountDeletionSection } from '@/components/features/settings/AccountDeletionSection'
import { createAdminClient } from '@/lib/supabase/admin'
import { PaymentSettings } from '@/components/features/settings/PaymentSettings'
import { PublicContactSettings } from '@/components/features/settings/PublicContactSettings'

export const dynamic = 'force-dynamic'

export default async function SettingsPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params
  const auth = await requireRole(['admin', 'gestor'])
  if (!auth.authorized) redirect('/login')

  const supabase = createAdminClient()

  const isAdmin = auth.role === 'admin'

  // Fetch properties and listings for this organization
  const { data: properties } = await supabase
    .from('properties')
    .select('id, name, ical_export_token')
    .eq('organization_id', auth.organizationId)

  const { data: listings } = await supabase
    .from('property_listings')
    .select('id, name, ical_url, sync_enabled, is_active, property_id, last_synced_at')
    .in('property_id', properties?.map(p => p.id) || [])
    .order('name', { ascending: true })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Fetch users only for admin
  const { data: users } = isAdmin
    ? await supabase
        .from('user_profiles')
        .select('id, email, full_name, role, created_at')
        .eq('organization_id', auth.organizationId)
        .order('created_at', { ascending: false })
    : { data: null }

  // Fetch Organization for payment settings
  const { data: organization } = await supabase
    .from('organizations')
    .select('id, name, slug, asaas_api_key, asaas_environment')
    .eq('id', auth.organizationId)
    .single()

  const { data: publicProfile } = organization
    ? await supabase
        .from('organization_public_profile')
        .select('*')
        .eq('organization_id', organization.id)
        .maybeSingle()
    : { data: null }

  const bookingUrl = organization?.slug ? `https://${organization.slug}.lodgra.io/booking` : null

  return (
    <AuthLayout>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
            <Settings className="h-5 w-5 text-gray-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Definições</h1>
            <p className="text-sm text-gray-500">Gerencie utilizadores, sincronização iCal e exportações</p>
          </div>
        </div>

        {organization && (
          <section className="mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-5 w-5 text-gray-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Empresa e reserva direta</h2>
                  </div>
                  <p className="text-sm text-gray-600">
                    O nome da empresa define o endereço público usado na página de reserva direta.
                  </p>
                  <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Nome da empresa</p>
                    <p className="mt-1 truncate text-sm font-semibold text-gray-900">{organization.name}</p>
                    {bookingUrl && (
                      <>
                        <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">Página pública</p>
                        <a
                          href={bookingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-sm font-medium text-blue-700 hover:text-blue-800"
                        >
                          <span className="truncate">{bookingUrl}</span>
                          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        </a>
                      </>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                    <Link
                      href={`/${locale}/settings/organizations/${organization.id}/branding`}
                      className="inline-flex items-center justify-center gap-2 rounded-md bg-[#1E40AF] px-4 py-2 text-sm font-semibold !text-white transition-colors hover:bg-[#16358f] hover:!text-white focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:ring-offset-2"
                    >
                      <Palette className="h-4 w-4 !text-white" />
                      Logo e marca
                    </Link>
                  </div>
                )}
              </div>

              {isAdmin && (
                <div className="mt-6 border-t border-gray-100 pt-6">
                  <h3 className="text-base font-semibold text-gray-900">Contato público para hóspedes</h3>
                  <p className="mt-1 mb-5 text-sm text-gray-600">
                    Estes dados aparecem na página pública de reserva direta para o hóspede falar com a empresa.
                  </p>
                  <PublicContactSettings organizationId={organization.id} initialProfile={publicProfile} />
                </div>
              )}
            </div>
          </section>
        )}

        {/* Change Password - All Users */}
        <section className="mb-8">
          <ChangePasswordSection />
        </section>

        {/* Privacy & Consent */}
        <section className="mb-8">
          <ConsentManagement />
        </section>

        {/* Data Export — RGPD/LGPD */}
        <section className="mb-8">
          <DataExportSection />
        </section>

        {/* User Management - Admin Only */}
        {isAdmin && (
          <section className="mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Gestão de Utilizadores</h2>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Gerencie os utilizadores da sua organização e defina as suas funções de acesso.
              </p>
              <SettingsUserManagement users={users || []} />
            </div>
          </section>
        )}
        
        {/* Payment Configuration (Brazil) - Admin Only */}
        {isAdmin && organization && (
          <section className="mb-8">
            <PaymentSettings organization={organization} />
          </section>
        )}

        {/* Import iCal URLs */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Upload className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Importar Reservas</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Cole o URL iCal da sua plataforma (Booking.com, Airbnb, Flatio, etc.) para importar automaticamente as reservas.
          </p>
          {properties && listings && <ICalSyncSettings listings={listings} propertyId={properties[0]?.id || ''} />}
        </section>

        {/* Export iCal URLs */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Download className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Exportar Reservas</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Use estes URLs para sincronizar as suas reservas com outras plataformas. Cada propriedade tem o seu próprio URL seguro com token de autenticação.
          </p>
          <ICalExportSection properties={properties || []} appUrl={appUrl} />
        </section>

        {/* Account Deletion — RGPD/LGPD */}
        <section className="mt-12 pt-8 border-t border-red-100">
          <AccountDeletionSection />
        </section>
      </div>
    </AuthLayout>
  )
}
