import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { PremiumCard, PremiumPageHeader, PremiumPageShell } from '@/components/common/layout/PremiumPage'
import { ChannelsClient } from './ChannelsClient'
import { ChannelsModeTabs } from './ChannelsModeTabs'
import { Settings2, CalendarDays, RefreshCw } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ChannelsSettingsPage() {
  const auth = await requireRole(['admin', 'gestor'])
  if (!auth.authorized) redirect('/login')
  const bookingApiEnabled = process.env.BOOKING_CHANNEL_ENABLED === 'true'

  const adminClient = createAdminClient()

  // Fetch property listings for this org
  const { data: properties } = await adminClient
    .from('properties')
    .select('id, name')
    .eq('organization_id', auth.organizationId)

  const propertyIds = properties?.map((p) => p.id) ?? []

  const { data: listings } = await adminClient
    .from('property_listings')
    .select('id, name, property_id')
    .in('property_id', propertyIds)
    .eq('is_active', true)
    .order('name', { ascending: true })

  // Annotate listings with property name
  const propertyMap = Object.fromEntries((properties ?? []).map((p) => [p.id, p.name]))

  const enrichedListings = (listings ?? []).map((l) => ({
    id: l.id,
    name: l.name || '',
    property_name: propertyMap[l.property_id] || '',
  }))

  // Fetch existing channel_listings for booking channel
  const { data: channelConfigs } = await adminClient
    .from('channel_listings')
    .select('id, property_listing_id, external_id, last_synced_at, sync_count, channels!inner(name)')
    .eq('organization_id', auth.organizationId)
    .eq('channels.name', 'booking')

  const existingConfigs = (channelConfigs ?? []).map((c) => ({
    property_listing_id: c.property_listing_id ?? '',
    external_property_id: c.external_id,
    last_synced_at: c.last_synced_at ?? null,
    sync_count: c.sync_count ?? 0,
  }))

  return (
    <AuthLayout>
      <PremiumPageShell maxWidth="max-w-3xl">
        <PremiumPageHeader
          title="Canais API"
          description="A integração oficial do Booking.com está desenvolvida, mas aguarda a reabertura de parcerias com desenvolvedores e a homologação do produto; em produção, o fluxo operacional continua a ser iCal."
          badge="Booking.com"
          icon={Settings2}
        />

        <ChannelsModeTabs
          icalPanel={
            <div className="space-y-4">
              <PremiumCard className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-700">
                    <RefreshCw className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-brand-text-medium">
                      Fluxo operacional em produção
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-brand-text-dark">
                      Sincronização ativa via iCal
                    </h2>
                    <p className="mt-1 text-sm text-brand-text-medium">
                      Este é o caminho que mantém Booking.com, Airbnb e outras plataformas atualizadas hoje.
                      O botão de sincronização e o cron diário atuam sobre este fluxo.
                    </p>
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-800">
                      <CalendarDays className="h-3.5 w-3.5" />
                      iCal ativo para produção
                    </div>
                    <div className="mt-4">
                      <Link
                        href="/pt-BR/sync"
                        className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-blue/90"
                      >
                        Abrir Sync iCal
                      </Link>
                    </div>
                  </div>
                </div>
              </PremiumCard>

              <div className="rounded-2xl border border-brand-gold/25 bg-brand-gold/10 p-4 text-sm text-brand-blue">
                <p className="font-medium mb-1">Sobre o fluxo iCal</p>
                <ul className="list-disc list-inside space-y-1 text-brand-text-medium">
                  <li>É a operação normal em produção para atualização de reservas</li>
                  <li>O botão `Sincronizar agora` da página `/sync` atua sobre este fluxo</li>
                  <li>O cron diário mantém a atualização recorrente às 03:00</li>
                  <li>Continua a cobrir Booking.com, Airbnb e demais plataformas anunciadas via iCal</li>
                </ul>
              </div>
            </div>
          }
          bookingPanel={
            <div className="space-y-4">
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-brand-text-medium">
                <p className="font-medium text-amber-900">Modo sandbox / preparação</p>
                <p className="mt-1">
                  A Booking native API está desenvolvida, mas permanece desativada até a Booking.com reabrir parcerias com desenvolvedores
                  e homologar o produto. Enquanto isso, este modo funciona apenas como preparação.
                </p>
              </div>

              <PremiumCard>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center mb-1">
                  <span className="text-lg font-semibold text-brand-text-dark transition-colors group-hover:text-brand-gold">Booking.com</span>
                  <span className="rounded-full border border-brand-gold/25 bg-brand-gold/10 px-2.5 py-0.5 text-xs font-medium text-brand-blue">
                    Desativado até homologação
                  </span>
                </div>
                <p className="mb-5 text-sm text-brand-text-medium">
                  O painel já está pronto para validar credenciais, importar reservas históricas e receber updates via webhook em ambiente de teste,
                  mas os controles permanecem desativados até existir parceria oficial ativa.
                </p>

                <ChannelsClient
                  listings={enrichedListings}
                  existingConfigs={existingConfigs}
                  disabled={!bookingApiEnabled}
                />
              </PremiumCard>

              <div className="rounded-2xl border border-brand-gold/25 bg-brand-gold/10 p-4 text-sm text-brand-blue">
                <p className="font-medium mb-1">Sobre a integração API</p>
                <ul className="list-disc list-inside space-y-1 text-brand-text-medium">
                  <li>As credenciais são armazenadas de forma segura e nunca expostas ao cliente</li>
                  <li>A sincronização inicial importa os últimos 90 dias de reservas</li>
                  <li>O iCal continua ativo para propriedades sem API configurada</li>
                  <li>Quando a Booking.com reabrir parcerias e homologar o produto, novas reservas chegarão automaticamente via webhook em tempo real</li>
                </ul>
              </div>
            </div>
          }
        />
      </PremiumPageShell>
    </AuthLayout>
  )
}
