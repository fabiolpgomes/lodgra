import { requireRole } from '@/lib/auth/requireRole';
import Link from 'next/link';
import { ChevronRight, Plus, Edit2, Trash2 } from 'lucide-react';

export default async function ChecklistsPage() {
  const { error } = await requireRole(['admin', 'gestor']);
  if (error) return error;

  // TODO: Fetch templates from API
  const templates = [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Modelos de Checklist</h1>
          <p className="mt-2 text-gray-600">
            Crie e gerencie templates de limpeza para suas propriedades
          </p>
        </div>
        <Link
          href="/[locale]/dashboard/settings/checklists/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="h-5 w-5" />
          Novo Modelo
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900">Nenhum modelo criado</h3>
          <p className="mt-1 text-gray-600">Comece criando seu primeiro template de checklist</p>
          <Link
            href="/[locale]/dashboard/settings/checklists/new"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="h-5 w-5" />
            Criar Modelo
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {templates.map((template: { id: string; name: string }) => (
            <div
              key={template.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{template.name}</h3>
                {template.description && (
                  <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                )}
                <div className="mt-2 text-sm text-gray-500">
                  {template.property_id ? 'Específico da propriedade' : 'Global'}
                  {' • '}
                  {template.items?.length || 0} itens
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/[locale]/dashboard/settings/checklists/${template.id}/edit`}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  <Edit2 className="h-5 w-5" />
                </Link>
                <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition">
                  <Trash2 className="h-5 w-5" />
                </button>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
