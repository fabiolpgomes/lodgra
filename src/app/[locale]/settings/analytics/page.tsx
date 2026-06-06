import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/requireRole';
import { AuthLayout } from '@/components/common/layout/AuthLayout';
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
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
            <BarChart3 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Google Analytics</h1>
            <p className="text-sm text-gray-600">Connect your Google Analytics account to track your property performance</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <AnalyticsSettingsClient />
        </div>
      </div>
    </AuthLayout>
  );
}
