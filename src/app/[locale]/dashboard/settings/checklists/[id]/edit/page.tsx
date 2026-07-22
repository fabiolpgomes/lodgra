import { requireRole } from '@/lib/auth/requireRole';
import { ChecklistBuilder } from '@/components/settings/ChecklistBuilder';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { redirect } from 'next/navigation';

export default async function EditChecklistPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const auth = await requireRole(['admin', 'gestor']);
  if (!auth.authorized) redirect('/auth/login');

  // TODO: Fetch template from API
  const template: { id: string; name: string; description?: string; property_id?: string; items: any[] } | null = null;

  if (!template) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Modelo não encontrado</h3>
        <Link
          href="/[locale]/dashboard/settings/checklists"
          className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
        >
          <ChevronLeft className="h-5 w-5" />
          Voltar
        </Link>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold text-gray-900">Editar Modelo</h1>
        </div>
      </div>

      <ChecklistBuilder initialTemplate={template ?? undefined} />
    </div>
  );
}
