import { requireRole } from '@/lib/auth/requireRole';
import { ChecklistBuilder } from '@/components/settings/ChecklistBuilder';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { redirect } from 'next/navigation';

export default async function NewChecklistPage() {
  const auth = await requireRole(['admin', 'gestor']);
  if (!auth.authorized) redirect('/auth/login');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/[locale]/dashboard/settings/checklists"
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Novo Modelo de Checklist</h1>
          <p className="mt-1 text-gray-600">Crie um template reutilizável para suas tarefas de limpeza</p>
        </div>
      </div>

      <ChecklistBuilder />
    </div>
  );
}
