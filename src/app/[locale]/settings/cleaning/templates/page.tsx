import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/requireRole';
import { createClient } from '@/lib/supabase/server';
import TemplatesManager from '@/components/cleaning/TemplatesManager';
import TemplateOnboarding from '@/components/cleaning/TemplateOnboarding';
import TemplateStats from '@/components/cleaning/TemplateStats';
import TemplateInsights from '@/components/cleaning/TemplateInsights';
import { HelpCircle, Zap } from 'lucide-react';

export const metadata = {
  title: 'Templates de Limpeza | Lodgra',
  description: 'Crie e gerencie templates de checklists para tarefas de limpeza',
};

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
    <>
      <div className="p-4 sm:p-8 space-y-8">
        {/* Header with Info */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">Templates de Limpeza</h1>
            <p className="text-gray-600 mt-2">
              Crie checklists reutilizáveis para garantir consistência nas tarefas de limpeza
            </p>
          </div>
          <div className="flex-shrink-0 text-blue-600">
            <HelpCircle className="h-6 w-6" />
          </div>
        </div>

        {/* Quick Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col gap-3 sm:flex-row">
            <Zap className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-blue-900">Templates Globais</p>
              <p className="text-blue-800 mt-1">
                Use em toda a organização ou customize por propriedade. Marque um como padrão para auto-selecionar.
              </p>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex flex-col gap-3 sm:flex-row">
            <Zap className="h-5 w-5 text-emerald-700 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-emerald-900">Reutilizável</p>
              <p className="text-emerald-800 mt-1">
                Crie uma vez, use em múltiplas tarefas. Duplique para criar variações customizadas.
              </p>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <TemplateStats />

        {/* Insights */}
        <TemplateInsights />

        {/* Main Content */}
        <TemplatesManager
          initialTemplates={templates || []}
          properties={properties || []}
        />
      </div>

      {/* Onboarding Tutorial */}
      <TemplateOnboarding />
    </>
  );
}
