import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/requireRole';
import AnalyticsSettingsClient from '@/components/analytics/AnalyticsSettingsClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Analytics Settings',
  description: 'Configure your Google Analytics account for tracking',
};

export default async function AnalyticsSettingsPage() {
  const auth = await requireRole(['admin', 'gestor']);
  if (!auth.authorized) redirect('/login');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Google Analytics Settings</h1>
        <p className="text-gray-600 mt-2">
          Connect your Google Analytics account to track your property performance.
        </p>
      </div>

      <AnalyticsSettingsClient />
    </div>
  );
}
