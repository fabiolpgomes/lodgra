import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/requireRole';
import { createClient } from '@/lib/supabase/server';

const TEMPLATES = [
  {
    name: 'Template A - T0/Studio',
    description: 'Modelo de limpeza para T0, Studio e Loft. Tempo estimado: 60-90 minutos',
    category: 'A',
    expected_time_min: 60,
    expected_time_max: 90,
    items: [
      'Trocar roupa de cama', 'Colocar fronhas limpas', 'Aspirar colchão',
      'Limpar cabeceiras', 'Limpar mesas de apoio', 'Limpar interruptores',
      'Limpar tomadas visíveis', 'Limpar espelhos', 'Limpar janelas interiores',
      'Aspirar sofá', 'Aspirar chão', 'Lavar chão',
      'Limpar bancada', 'Limpar lava-loiça', 'Limpar torneiras',
      'Limpar placa', 'Limpar microondas', 'Limpar frigorífico exterior',
      'Verificar utensílios', 'Verificar copos', 'Verificar talheres',
      'Esvaziar lixo', 'Substituir saco lixo',
      'Limpar sanita', 'Limpar lavatório', 'Limpar espelho banheiro',
      'Limpar duche', 'Limpar ralos', 'Remover cabelos',
      'Trocar toalhas', 'Repor papel higiénico', 'Lavar chão banheiro',
      'Verificar luzes', 'Verificar Wifi', 'Verificar TV',
      'Verificar ar condicionado', 'Cheiro agradável',
    ],
  },
  {
    name: 'Template B - T1/T2',
    description: 'Modelo de limpeza para T1 e T2. Tempo estimado: 90-150 minutos',
    category: 'B',
    expected_time_min: 90,
    expected_time_max: 150,
    items: [
      'Trocar roupa de cama - Quarto 1', 'Aspirar colchão - Quarto 1',
      'Limpar móveis - Quarto 1', 'Limpar armários exterior - Quarto 1',
      'Limpar espelhos - Quarto 1', 'Aspirar chão - Quarto 1',
      'Lavar chão - Quarto 1',
      'Trocar roupa de cama - Quarto 2', 'Aspirar colchão - Quarto 2',
      'Limpar móveis - Quarto 2', 'Limpar armários exterior - Quarto 2',
      'Limpar espelhos - Quarto 2', 'Aspirar chão - Quarto 2',
      'Lavar chão - Quarto 2',
      'Limpar televisão', 'Limpar comandos', 'Aspirar sofá',
      'Limpar móveis sala', 'Aspirar tapetes', 'Aspirar chão sala',
      'Lavar chão sala',
      'Limpar bancada', 'Limpar armários', 'Limpar frigorífico interior',
      'Limpar frigorífico exterior', 'Limpar microondas', 'Limpar forno exterior',
      'Limpar exaustor exterior', 'Verificar inventário cozinha',
      'Limpar sanita - Banheiro 1', 'Limpar lavatório - Banheiro 1',
      'Limpar espelho - Banheiro 1', 'Limpar duche - Banheiro 1',
      'Limpar torneiras - Banheiro 1', 'Limpar ralos - Banheiro 1',
      'Trocar toalhas - Banheiro 1', 'Repor amenities - Banheiro 1',
      'Limpar sanita - Banheiro 2', 'Limpar lavatório - Banheiro 2',
      'Limpar espelho - Banheiro 2', 'Limpar duche - Banheiro 2',
      'Limpar torneiras - Banheiro 2', 'Limpar ralos - Banheiro 2',
      'Trocar toalhas - Banheiro 2', 'Repor amenities - Banheiro 2',
      'Varrer varanda', 'Limpar mesas varanda', 'Limpar cadeiras varanda',
      'Verificar luzes', 'Verificar água quente', 'Verificar Wifi',
      'Verificar TV', 'Verificar ar condicionado',
    ],
  },
  {
    name: 'Template C - T3/T4/Vivenda',
    description: 'Modelo de limpeza para T3, T4 e Vivendas. Tempo estimado: 120-180 minutos',
    category: 'C',
    expected_time_min: 120,
    expected_time_max: 180,
    items: [
      'Limpar entrada', 'Limpar portão', 'Limpar terraço',
      'Limpar mobiliário exterior', 'Limpar churrasqueira', 'Limpar piscina',
      'Remover folhas',
      'Trocar roupa de cama - Quarto 1', 'Aspirar colchão - Quarto 1',
      'Limpar armários - Quarto 1', 'Limpar espelhos - Quarto 1',
      'Limpar móveis - Quarto 1', 'Aspirar chão - Quarto 1',
      'Lavar chão - Quarto 1',
      'Trocar roupa de cama - Quarto 2', 'Aspirar colchão - Quarto 2',
      'Limpar armários - Quarto 2', 'Limpar espelhos - Quarto 2',
      'Limpar móveis - Quarto 2', 'Aspirar chão - Quarto 2',
      'Lavar chão - Quarto 2',
      'Trocar roupa de cama - Quarto 3', 'Aspirar colchão - Quarto 3',
      'Limpar armários - Quarto 3', 'Limpar espelhos - Quarto 3',
      'Limpar móveis - Quarto 3', 'Aspirar chão - Quarto 3',
      'Lavar chão - Quarto 3',
      'Limpar televisão', 'Limpar comandos', 'Aspirar sofás',
      'Limpar móveis sala', 'Limpar decoração', 'Aspirar tapetes',
      'Aspirar chão sala', 'Lavar chão sala',
      'Limpar bancadas', 'Limpar lava-loiça', 'Limpar frigorífico interior',
      'Limpar frigorífico exterior', 'Limpar forno', 'Limpar microondas',
      'Limpar exaustor', 'Limpar máquina café', 'Limpar torradeira',
      'Verificar inventário cozinha',
      'Limpar sanita - Banheiro 1', 'Limpar lavatório - Banheiro 1',
      'Limpar espelho - Banheiro 1', 'Limpar duche - Banheiro 1',
      'Limpar torneiras - Banheiro 1', 'Remover calcário visível - Banheiro 1',
      'Limpar ralos - Banheiro 1', 'Trocar toalhas - Banheiro 1',
      'Repor amenities - Banheiro 1', 'Lavar chão - Banheiro 1',
      'Limpar sanita - Banheiro 2', 'Limpar lavatório - Banheiro 2',
      'Limpar espelho - Banheiro 2', 'Limpar duche - Banheiro 2',
      'Limpar torneiras - Banheiro 2', 'Remover calcário visível - Banheiro 2',
      'Limpar ralos - Banheiro 2', 'Trocar toalhas - Banheiro 2',
      'Repor amenities - Banheiro 2', 'Lavar chão - Banheiro 2',
      'Varrer varanda', 'Limpar mesas varanda', 'Limpar cadeiras varanda',
      'Verificar luzes', 'Verificar água quente', 'Verificar Wifi',
      'Verificar TV', 'Verificar ar condicionado',
    ],
  },
];

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'gestor', 'manager']);
    if (!auth.authorized) return auth.response!;

    const supabase = await createClient();
    const results = [];

    for (const template of TEMPLATES) {
      const { data: existing } = await supabase
        .from('cleaning_checklist_templates')
        .select('id')
        .eq('organization_id', auth.organizationId)
        .eq('name', template.name)
        .single();

      if (existing) {
        results.push({
          name: template.name,
          status: 'already_exists',
          items_count: template.items.length,
        });
        continue;
      }

      const { data: createdTemplate, error: templateError } = await supabase
        .from('cleaning_checklist_templates')
        .insert({
          organization_id: auth.organizationId,
          name: template.name,
          description: template.description,
          category: template.category,
          expected_time_min: template.expected_time_min,
          expected_time_max: template.expected_time_max,
        })
        .select()
        .single();

      if (templateError || !createdTemplate) {
        results.push({
          name: template.name,
          status: 'error',
          error: templateError?.message || 'Failed to create template',
        });
        continue;
      }

      const itemsToInsert = template.items.map((item, index) => ({
        template_id: createdTemplate.id,
        item_name: item,
        sort_order: index,
      }));

      const { error: itemsError } = await supabase
        .from('cleaning_checklist_items')
        .insert(itemsToInsert);

      if (itemsError) {
        results.push({
          name: template.name,
          status: 'error',
          error: itemsError.message,
        });
        continue;
      }

      results.push({
        name: template.name,
        status: 'created',
        items_count: template.items.length,
      });
    }

    return NextResponse.json({ message: 'Templates seeded', results });
  } catch (error) {
    console.error('Error seeding templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
