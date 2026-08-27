import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/requireRole';
import { AuthLayout } from '@/components/common/layout/AuthLayout';
import { PremiumCard, PremiumMetricCard, PremiumPageHeader, PremiumPageShell } from '@/components/common/layout/PremiumPage';
import AnalyticsSettingsClient from '@/components/analytics/AnalyticsSettingsClient';
import { BarChart3, Globe, LineChart, MousePointerClick } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTrafficSummary } from '@/lib/analytics/traffic';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Google Analytics Settings',
  description: 'Configure your Google Analytics account for tracking',
};

export default async function AnalyticsSettingsPage() {
  const auth = await requireRole(['admin', 'gestor']);
  if (!auth.authorized) redirect('/login');

  const supabase = createAdminClient();
  const { data: organization } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('id', auth.organizationId)
    .single();

  const trafficSummary = organization?.id
    ? await getTrafficSummary(supabase, organization.id, 30).catch((error) => {
        console.error('[Analytics Settings] Failed to load traffic summary:', error);
        return null;
      })
    : null;

  const bookingUrl = organization?.slug ? `https://${organization.slug}.lodgra.io/booking` : null;

  return (
    <AuthLayout>
      <PremiumPageShell maxWidth="max-w-4xl">
        <PremiumPageHeader
          title="Google Analytics"
          description="Connect your Google Analytics account to track your property performance"
          badge="Integração"
          icon={BarChart3}
        />

        <section className="mb-8 space-y-4">
          <PremiumCard>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <LineChart className="h-5 w-5 text-brand-blue transition-colors group-hover:text-brand-gold" />
                  <h2 className="text-lg font-semibold text-brand-text-dark transition-colors group-hover:text-brand-gold">Tráfego da empresa</h2>
                </div>
                <p className="mt-2 text-sm text-brand-text-medium">
                  Visão consolidada da navegação na página pública da sua empresa e do link direto de reserva.
                </p>
              </div>
              {bookingUrl && (
              <Link
                href={bookingUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-gold sm:w-auto"
              >
                <Globe className="h-4 w-4" />
                Abrir booking
              </Link>
              )}
            </div>

            {trafficSummary ? (
              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <PremiumMetricCard
                    label="Visualizações 30d"
                    value={trafficSummary.pageViews30d.toLocaleString()}
                    type="TRÁFEGO"
                    description="Eventos page_view capturados no período"
                    icon={MousePointerClick}
                    tone="blue"
                  />
                  <PremiumMetricCard
                    label="Visualizações 7d"
                    value={trafficSummary.pageViews7d.toLocaleString()}
                    type="SEMANA"
                    description="Últimos 7 dias"
                    icon={LineChart}
                    tone="gold"
                  />
                  <PremiumMetricCard
                    label="Paths únicos"
                    value={trafficSummary.uniquePaths.toLocaleString()}
                    type="ROTAS"
                    description="Páginas públicas mais visitadas"
                    icon={Globe}
                    tone="success"
                  />
                  <PremiumMetricCard
                    label="Hostnames únicos"
                    value={trafficSummary.uniqueHostnames.toLocaleString()}
                    type="DOMÍNIOS"
                    description="Subdomínios e hosts observados"
                    icon={BarChart3}
                    tone="danger"
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <PremiumCard className="p-0">
                    <div className="border-b border-brand-bg px-5 py-4">
                      <h3 className="text-xs font-black uppercase tracking-widest text-brand-text-dark">Tendência diária</h3>
                    </div>
                    <div className="space-y-3 px-5 py-4">
                      {trafficSummary.dailyViews.map((day) => {
                        const max = Math.max(...trafficSummary.dailyViews.map((item) => item.views), 1)
                        const width = day.views > 0 ? Math.max(4, Math.round((day.views / max) * 100)) : 2
                        return (
                          <div key={day.date} className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-semibold text-brand-text-medium">
                              <span>{day.date}</span>
                              <span>{day.views}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-brand-bg">
                              <div className="h-full rounded-full bg-gradient-to-r from-brand-blue to-brand-gold" style={{ width: `${width}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </PremiumCard>

                  <PremiumCard className="p-0">
                    <div className="border-b border-brand-bg px-5 py-4">
                      <h3 className="text-xs font-black uppercase tracking-widest text-brand-text-dark">Paths mais visitados</h3>
                    </div>
                    <div className="divide-y divide-brand-bg">
                      {trafficSummary.topPaths.length > 0 ? trafficSummary.topPaths.map((item) => (
                        <div key={item.path} className="flex items-center justify-between gap-4 px-5 py-4">
                          <span className="truncate text-sm font-semibold text-brand-text-dark">{item.path}</span>
                          <span className="shrink-0 text-sm font-black text-brand-gold">{item.views}</span>
                        </div>
                      )) : (
                        <div className="px-5 py-8 text-sm text-brand-text-medium">
                          Ainda não há eventos suficientes. Abra a página pública com o banner de analytics aceito.
                        </div>
                      )}
                    </div>
                  </PremiumCard>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <PremiumCard className="p-0">
                    <div className="border-b border-brand-bg px-5 py-4">
                      <h3 className="text-xs font-black uppercase tracking-widest text-brand-text-dark">Hostnames capturados</h3>
                    </div>
                    <div className="divide-y divide-brand-bg">
                      {trafficSummary.topHostnames.length > 0 ? trafficSummary.topHostnames.map((item) => (
                        <div key={item.hostname} className="flex items-center justify-between gap-4 px-5 py-4">
                          <span className="truncate text-sm font-semibold text-brand-text-dark">{item.hostname}</span>
                          <span className="shrink-0 text-sm font-black text-brand-blue">{item.views}</span>
                        </div>
                      )) : (
                        <div className="px-5 py-8 text-sm text-brand-text-medium">
                          Nenhum hostname registrado ainda.
                        </div>
                      )}
                    </div>
                  </PremiumCard>

                  <PremiumCard className="p-0">
                    <div className="border-b border-brand-bg px-5 py-4">
                      <h3 className="text-xs font-black uppercase tracking-widest text-brand-text-dark">Última atividade</h3>
                    </div>
                    <div className="px-5 py-6">
                      <p className="text-sm text-brand-text-medium">
                        {trafficSummary.lastSeenAt
                          ? `Último page_view capturado em ${new Date(trafficSummary.lastSeenAt).toLocaleString('pt-BR')}`
                          : 'Ainda não capturamos tráfego desta empresa.'}
                      </p>
                    </div>
                  </PremiumCard>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-brand-bg px-5 py-8 text-sm text-brand-text-medium">
                Sem dados de tráfego ainda. Quando os visitantes aceitarem analytics e abrirem a página pública, os números aparecem aqui.
              </div>
            )}
          </PremiumCard>
        </section>

        <PremiumCard className="p-0">
          <AnalyticsSettingsClient />
        </PremiumCard>
      </PremiumPageShell>
    </AuthLayout>
  );
}
