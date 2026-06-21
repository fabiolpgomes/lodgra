import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/requireRole';
import { createClient } from '@/lib/supabase/server';
import TemplatesManager from '@/components/cleaning/TemplatesManager';

export default async function TemplatesPage() {
  const auth = await requireRole(['admin', 'gestor']);
  if (!auth.authorized) {
    return redirect('/');
  }

  const supabase = await createClient();

  // Fetch templates
  const { data: templates } = await supabase
    .from('cleaning_checklist_templates')
    .select('*')
    .eq('organization_id', auth.organizationId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  // Fetch properties
  const { data: properties } = await supabase
    .from('properties')
    .select('id, name')
    .eq('organization_id', auth.organizationId)
    .eq('deleted_at', null)
    .order('name');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Templates de Limpeza</h1>
        <p className="text-gray-600 mt-1">
          Crie e gerencie templates de checklists para tarefas de limpeza
        </p>
      </div>

      <TemplatesManager
        initialTemplates={templates || []}
        properties={properties || []}
      />
    </div>
  );
}
