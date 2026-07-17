import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/requireRole';
import { AuthLayout } from '@/components/common/layout/AuthLayout';
import { PremiumCard, PremiumPageHeader, PremiumPageShell } from '@/components/common/layout/PremiumPage';
import AnalyticsSettingsClient from '@/components/analytics/AnalyticsSettingsClient';
import { BarChart3 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Google Analytics Settings',
  description: 'Configure your Google Analytics account for tracking',
};

export default async function AnalyticsSettingsPage() {
  const auth = await requireRole(['admin', 'gestor']);
  if (!auth.authorized) redirect('/login');

  return (
    <AuthLayout>
      <PremiumPageShell maxWidth="max-w-4xl">
        <PremiumPageHeader
          title="Google Analytics"
          description="Connect your Google Analytics account to track your property performance"
          badge="Integração"
          icon={BarChart3}
        />

        <PremiumCard className="p-0">
          <AnalyticsSettingsClient />
        </PremiumCard>
      </PremiumPageShell>
    </AuthLayout>
  );
}
