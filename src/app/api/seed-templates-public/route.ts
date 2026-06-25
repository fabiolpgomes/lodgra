import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const FIXED_ORG_ID = '00000000-0000-0000-0000-000000000001';

const TEMPLATES = [
  {
    name: 'Template A - T0/Studio',
    description: 'Modelo de limpeza para T0, Studio e Loft. Tempo estimado: 60-90 minutos',
    items: [
      'Trocar roupa de cama', 'Colocar fronhas limpas', 'Aspirar colchão',
      'Limpar cabeceiras', 'Limpar mesas de apoio', 'Limpar interruptores',
      'Limpar tomadas visíveis', 'Limpar espelhos', 'Limpar janelas interiores',
      'Aspirar sofá', 'Aspirar chão', 'Lavar chão',
    ],
  },
  {
    name: 'Template B - T1/T2',
    description: 'Modelo de limpeza para T1 e T2. Tempo estimado: 90-150 minutos',
    items: [
      'Trocar roupa de cama - Quarto 1', 'Aspirar colchão - Quarto 1',
      'Limpar móveis - Quarto 1', 'Limpar armários exterior - Quarto 1',
      'Trocar roupa de cama - Quarto 2', 'Aspirar colchão - Quarto 2',
      'Limpar móveis - Quarto 2', 'Limpar armários exterior - Quarto 2',
    ],
  },
  {
    name: 'Template C - T3/T4/Vivenda',
    description: 'Modelo de limpeza para T3, T4 e Vivendas. Tempo estimado: 120-180 minutos',
    items: [
      'Limpar entrada', 'Limpar portão', 'Limpar terraço',
      'Trocar roupa de cama - Quarto 1', 'Aspirar colchão - Quarto 1',
      'Trocar roupa de cama - Quarto 2', 'Aspirar colchão - Quarto 2',
      'Trocar roupa de cama - Quarto 3', 'Aspirar colchão - Quarto 3',
    ],
  },
];

export async function POST() {
  try {
    const admin = createAdminClient();
    const results = [];

    for (const template of TEMPLATES) {
      const { data: existing } = await admin
        .from('cleaning_checklist_templates')
        .select('id')
        .eq('organization_id', FIXED_ORG_ID)
        .eq('name', template.name)
        .single();

      if (existing) {
        results.push({ name: template.name, status: 'already_exists' });
        continue;
      }

      const { data: createdTemplate, error: templateError } = await admin
        .from('cleaning_checklist_templates')
        .insert({
          organization_id: FIXED_ORG_ID,
          name: template.name,
          description: template.description,
          is_active: true,
        })
        .select()
        .single();

      if (templateError || !createdTemplate) {
        results.push({ name: template.name, status: 'error', error: templateError?.message });
        continue;
      }

      const itemsToInsert = template.items.map((item, index) => ({
        template_id: createdTemplate.id,
        label: item,
        order_index: index,
      }));

      const { error: itemsError } = await admin
        .from('cleaning_checklist_items')
        .insert(itemsToInsert);

      if (itemsError) {
        results.push({ name: template.name, status: 'error', error: itemsError.message });
        continue;
      }

      results.push({ name: template.name, status: 'created', items_count: template.items.length });
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 });
  }
}
