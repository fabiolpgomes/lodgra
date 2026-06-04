import { requireRole } from '@/lib/auth/requireRole';
import { ChecklistBuilder } from '@/components/settings/ChecklistBuilder';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default async function NewChecklistPage() {
  const { error } = await requireRole(['admin', 'gestor']);
  if (error) return error;

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
