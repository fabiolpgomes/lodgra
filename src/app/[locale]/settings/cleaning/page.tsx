/**
 * Story 29.7: Manager View Dashboard for cleaning tasks
 */

import { requireRole } from '@/lib/auth/requireRole';
import CleaningManagerDashboard from '@/components/cleaning/CleaningManagerDashboard';

export const metadata = {
  title: 'Cleaning Dashboard',
  description: 'Manage cleaning tasks and track completion',
};

export default async function CleaningPage() {
  const auth = await requireRole(['admin', 'gestor']);
  if (!auth.authorized) {
    return auth.response;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <CleaningManagerDashboard />
      </div>
    </div>
  );
}
