/**
 * POST /api/cleaning/templates/seed
 * Seed default cleaning templates (A, B, C) based on PRD
 * Run once to populate templates
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/requireRole';

// Template definitions
const TEMPLATE_A = {
  name: 'Template A - T0/Studio',
  description: 'Modelo de limpeza para T0, Studio e Loft. Tempo estimado: 60-90 minutos',
  category: 'A',
  expectedTimeMin: 60,
  expectedTimeMax: 90,
  items: [
    // Bedroom/Living Area
    'Trocar roupa de cama',
    'Colocar fronhas limpas',
    'Aspirar colchão',
    'Limpar cabeceiras',
    'Limpar mesas de apoio',
    'Limpar interruptores',
    'Limpar tomadas visíveis',
    'Limpar espelhos',
    'Limpar janelas interiores',
    'Aspirar sofá',
    'Aspirar chão',
    'Lavar chão',
    // Kitchen
    'Limpar bancada',
    'Limpar lava-loiça',
    'Limpar torneiras',
    'Limpar placa',
    'Limpar microondas',
    'Limpar frigorífico exterior',
    'Verificar utensílios',
    'Verificar copos',
    'Verificar talheres',
    'Esvaziar lixo',
    'Substituir saco lixo',
    // Bathroom
    'Limpar sanita',
    'Limpar lavatório',
    'Limpar espelho banheiro',
    'Limpar duche',
    'Limpar ralos',
    'Remover cabelos',
    'Trocar toalhas',
    'Repor papel higiénico',
    'Lavar chão banheiro',
    // Final Verification
    'Verificar luzes',
    'Verificar Wifi',
    'Verificar TV',
    'Verificar ar condicionado',
    'Cheiro agradável',
  ],
};

const TEMPLATE_B = {
  name: 'Template B - T1/T2',
  description: 'Modelo de limpeza para T1 e T2. Tempo estimado: 90-150 minutos',
  category: 'B',
  expectedTimeMin: 90,
  expectedTimeMax: 150,
  items: [
    // Bedrooms
    'Trocar roupa de cama - Quarto 1',
    'Aspirar colchão - Quarto 1',
    'Limpar móveis - Quarto 1',
    'Limpar armários exterior - Quarto 1',
    'Limpar espelhos - Quarto 1',
    'Aspirar chão - Quarto 1',
    'Lavar chão - Quarto 1',
    'Trocar roupa de cama - Quarto 2',
    'Aspirar colchão - Quarto 2',
    'Limpar móveis - Quarto 2',
    'Limpar armários exterior - Quarto 2',
    'Limpar espelhos - Quarto 2',
    'Aspirar chão - Quarto 2',
    'Lavar chão - Quarto 2',
    // Living Room
    'Limpar televisão',
    'Limpar comandos',
    'Aspirar sofá',
    'Limpar móveis sala',
    'Aspirar tapetes',
    'Aspirar chão sala',
    'Lavar chão sala',
    // Kitchen
    'Limpar bancada',
    'Limpar armários',
    'Limpar frigorífico interior',
    'Limpar frigorífico exterior',
    'Limpar microondas',
    'Limpar forno exterior',
    'Limpar exaustor exterior',
    'Verificar inventário cozinha',
    // Bathrooms
    'Limpar sanita - Banheiro 1',
    'Limpar lavatório - Banheiro 1',
    'Limpar espelho - Banheiro 1',
    'Limpar duche - Banheiro 1',
    'Limpar torneiras - Banheiro 1',
    'Limpar ralos - Banheiro 1',
    'Trocar toalhas - Banheiro 1',
    'Repor amenities - Banheiro 1',
    'Limpar sanita - Banheiro 2',
    'Limpar lavatório - Banheiro 2',
    'Limpar espelho - Banheiro 2',
    'Limpar duche - Banheiro 2',
    'Limpar torneiras - Banheiro 2',
    'Limpar ralos - Banheiro 2',
    'Trocar toalhas - Banheiro 2',
    'Repor amenities - Banheiro 2',
    // Balcony
    'Varrer varanda',
    'Limpar mesas varanda',
    'Limpar cadeiras varanda',
    // Final Verification
    'Verificar luzes',
    'Verificar água quente',
    'Verificar Wifi',
    'Verificar TV',
    'Verificar ar condicionado',
  ],
};

const TEMPLATE_C = {
  name: 'Template C - T3/T4/Vivenda',
  description: 'Modelo de limpeza para T3, T4 e Vivendas. Tempo estimado: 120-180 minutos',
  category: 'C',
  expectedTimeMin: 120,
  expectedTimeMax: 180,
  items: [
    // Exterior
    'Limpar entrada',
    'Limpar portão',
    'Limpar terraço',
    'Limpar mobiliário exterior',
    'Limpar churrasqueira',
    'Limpar piscina',
    'Remover folhas',
    // Bedrooms
    'Trocar roupa de cama - Quarto 1',
    'Aspirar colchão - Quarto 1',
    'Limpar armários - Quarto 1',
    'Limpar espelhos - Quarto 1',
    'Limpar móveis - Quarto 1',
    'Aspirar chão - Quarto 1',
    'Lavar chão - Quarto 1',
    'Trocar roupa de cama - Quarto 2',
    'Aspirar colchão - Quarto 2',
    'Limpar armários - Quarto 2',
    'Limpar espelhos - Quarto 2',
    'Limpar móveis - Quarto 2',
    'Aspirar chão - Quarto 2',
    'Lavar chão - Quarto 2',
    'Trocar roupa de cama - Quarto 3',
    'Aspirar colchão - Quarto 3',
    'Limpar armários - Quarto 3',
    'Limpar espelhos - Quarto 3',
    'Limpar móveis - Quarto 3',
    'Aspirar chão - Quarto 3',
    'Lavar chão - Quarto 3',
    // Living Areas
    'Limpar televisão',
    'Limpar comandos',
    'Aspirar sofás',
    'Limpar móveis sala',
    'Limpar decoração',
    'Aspirar tapetes',
    'Aspirar chão sala',
    'Lavar chão sala',
    // Kitchen Premium
    'Limpar bancadas',
    'Limpar lava-loiça',
    'Limpar frigorífico interior',
    'Limpar frigorífico exterior',
    'Limpar forno',
    'Limpar microondas',
    'Limpar exaustor',
    'Limpar máquina café',
    'Limpar torradeira',
    'Verificar inventário cozinha',
    // Bathrooms
    'Limpar sanita - Banheiro 1',
    'Limpar lavatório - Banheiro 1',
    'Limpar espelho - Banheiro 1',
    'Limpar duche - Banheiro 1',
    'Limpar torneiras - Banheiro 1',
    'Remover calcário visível - Banheiro 1',
    'Limpar ralos - Banheiro 1',
    'Trocar toalhas - Banheiro 1',
    'Repor amenities - Banheiro 1',
    'Limpar sanita - Banheiro 2',
    'Limpar lavatório - Banheiro 2',
    'Limpar espelho - Banheiro 2',
    'Limpar duche - Banheiro 2',
    'Limpar torneiras - Banheiro 2',
    'Remover calcário visível - Banheiro 2',
    'Limpar ralos - Banheiro 2',
    'Trocar toalhas - Banheiro 2',
    'Repor amenities - Banheiro 2',
    // Laundry Control
    'Contar toalhas',
    'Contar lençóis',
    'Registar peças em falta',
    // Final Inspection
    'Cheiro agradável',
    'Sem cabelos',
    'Sem manchas',
    'Camas estilo hotel',
    'Amenities completas',
  ],
};

export async function POST(request: NextRequest) {
  try {
    // Check authorization (admin or gestor only)
    const auth = await requireRole(['admin', 'gestor']);
    if (!auth.authorized) return auth.response!;

    const supabase = await createClient();

    // Create templates
    const templates = [TEMPLATE_A, TEMPLATE_B, TEMPLATE_C];
    const results = [];

    for (const template of templates) {
      // Check if template already exists
      const { data: existing } = await supabase
        .from('cleaning_checklist_templates')
        .select('id')
        .eq('name', template.name)
        .single();

      if (existing) {
        results.push({
          name: template.name,
          status: 'skipped',
          reason: 'Template already exists',
        });
        continue;
      }

      // Insert template
      const { data: newTemplate, error: templateError } = await supabase
        .from('cleaning_checklist_templates')
        .insert({
          name: template.name,
          description: template.description,
          category: template.category,
          expected_time_min: template.expectedTimeMin,
          expected_time_max: template.expectedTimeMax,
          is_active: true,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Insert items
      const itemsToInsert = template.items.map((item, index) => ({
        template_id: newTemplate.id,
        item,
        order: index + 1,
      }));

      const { error: itemsError } = await supabase
        .from('cleaning_checklist_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      results.push({
        name: template.name,
        status: 'created',
        templateId: newTemplate.id,
        itemCount: template.items.length,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Templates seeded successfully',
      results,
    });
  } catch (error) {
    console.error('Error seeding templates:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
