/**
 * Story 29.7: Manager View Dashboard for cleaning tasks
 */

import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/requireRole';
import { AuthLayout } from '@/components/common/layout/AuthLayout';
import { PremiumPageHeader, PremiumPageShell } from '@/components/common/layout/PremiumPage';
import CleaningManagerDashboard from '@/components/cleaning/CleaningManagerDashboard';
import { Sparkles } from 'lucide-react';

export const metadata = {
  title: 'Cleaning Dashboard',
  description: 'Manage cleaning tasks and track completion',
};

export default async function CleaningPage() {
  const auth = await requireRole(['admin', 'gestor']);
  if (!auth.authorized) {
    redirect('/');
  }

  return (
    <AuthLayout>
      <PremiumPageShell>
        <PremiumPageHeader
          title="Limpeza"
          description="Gerencie tarefas de limpeza e acompanhe conclusões"
          badge="Operação"
          icon={Sparkles}
        />
        <CleaningManagerDashboard />
      </PremiumPageShell>
    </AuthLayout>
  );
}
