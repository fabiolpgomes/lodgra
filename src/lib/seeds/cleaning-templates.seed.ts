import { createClient } from '@/lib/supabase/server';

interface TemplateItem {
  label: string;
  category: string;
  is_required?: boolean;
}

const DEFAULT_TEMPLATES = [
  {
    name: 'Limpeza Padrão',
    description: 'Template padrão para limpezas regulares após checkout',
    is_global: true,
    is_default: true,
    items: [
      // Sala de estar
      { label: 'Aspirar tapetes e sofás', category: 'Sala de estar', is_required: true },
      { label: 'Limpar superfícies e móveis', category: 'Sala de estar', is_required: true },
      { label: 'Varrer e passar pano no chão', category: 'Sala de estar', is_required: true },
      { label: 'Limpar espelhos e vidros', category: 'Sala de estar' },
      { label: 'Esvaziar e limpar lixeiras', category: 'Sala de estar' },

      // Quarto
      { label: 'Trocar lençóis e fronhas', category: 'Quarto', is_required: true },
      { label: 'Aspirar cama e debaixo dela', category: 'Quarto', is_required: true },
      { label: 'Limpar móveis e superfícies', category: 'Quarto', is_required: true },
      { label: 'Varrer e passar pano no chão', category: 'Quarto', is_required: true },
      { label: 'Limpar janelas e cortinas', category: 'Quarto' },

      // Cozinha
      { label: 'Limpar e desinfetar balcão', category: 'Cozinha', is_required: true },
      { label: 'Lavar louça ou esvaziar máquina', category: 'Cozinha', is_required: true },
      { label: 'Limpar fogão e forno', category: 'Cozinha', is_required: true },
      { label: 'Varrer e passar pano no chão', category: 'Cozinha', is_required: true },
      { label: 'Limpar refrigerador', category: 'Cozinha' },
      { label: 'Limpar microondas', category: 'Cozinha' },

      // Casa de Banho
      { label: 'Limpar e desinfetar lavabo', category: 'Casa de Banho', is_required: true },
      { label: 'Limpar vaso sanitário', category: 'Casa de Banho', is_required: true },
      { label: 'Limpar chuveiro/banheira', category: 'Casa de Banho', is_required: true },
      { label: 'Trocar toalhas', category: 'Casa de Banho', is_required: true },
      { label: 'Varrer e passar pano no chão', category: 'Casa de Banho', is_required: true },
      { label: 'Limpar espelho', category: 'Casa de Banho' },

      // Geral
      { label: 'Verificar iluminação', category: 'Geral' },
      { label: 'Verificar ar condicionado/aquecimento', category: 'Geral' },
      { label: 'Tirar fotos de áreas-chave', category: 'Geral', is_required: true },
    ],
  },
  {
    name: 'Limpeza Profunda',
    description: 'Limpeza mais completa com detalhes extras',
    is_global: true,
    is_default: false,
    items: [
      { label: 'Aspirar e limpar todos os tapetes profundamente', category: 'Geral', is_required: true },
      { label: 'Lavar todas as janelas (interior e exterior)', category: 'Geral', is_required: true },
      { label: 'Limpar atrás de móveis', category: 'Geral', is_required: true },
      { label: 'Desinfetar todas as superfícies de toque', category: 'Geral', is_required: true },
      { label: 'Limpar base das paredes', category: 'Geral', is_required: true },
      { label: 'Limpar interior de armários', category: 'Cozinha' },
      { label: 'Limpar interior de geladeira', category: 'Cozinha' },
      { label: 'Limpar dentro de fornos', category: 'Cozinha' },
      { label: 'Lavar cortinas', category: 'Quarto' },
      { label: 'Limpar radiadores', category: 'Geral' },
      { label: 'Limpar luminárias', category: 'Geral' },
    ],
  },
  {
    name: 'Limpeza Rápida',
    description: 'Limpeza essencial entre hóspedes',
    is_global: true,
    is_default: false,
    items: [
      { label: 'Trocar lençóis', category: 'Quarto', is_required: true },
      { label: 'Aspirar e limpar piso', category: 'Geral', is_required: true },
      { label: 'Limpar casa de banho', category: 'Casa de Banho', is_required: true },
      { label: 'Limpar cozinha', category: 'Cozinha', is_required: true },
      { label: 'Limpar superfícies de toque', category: 'Geral', is_required: true },
      { label: 'Esvaziar lixo', category: 'Geral', is_required: true },
    ],
  },
];

export async function seedCleaningTemplates(organizationId: string) {
  try {
    const supabase = await createClient();

    for (const template of DEFAULT_TEMPLATES) {
      // Check if template already exists
      const { data: existing } = await supabase
        .from('cleaning_checklist_templates')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('name', template.name)
        .eq('is_global', true)
        .single();

      if (existing) {
        console.log(`Template "${template.name}" already exists`);
        continue;
      }

      // Create template
      const { data: newTemplate, error: templateError } = await supabase
        .from('cleaning_checklist_templates')
        .insert({
          organization_id: organizationId,
          property_id: null,
          name: template.name,
          description: template.description,
          is_global: template.is_global,
          is_default: template.is_default,
          is_active: true,
        })
        .select()
        .single();

      if (templateError) {
        console.error(`Error creating template "${template.name}":`, templateError);
        continue;
      }

      // Create template items
      if (template.items.length > 0) {
        const itemsToInsert = template.items.map((item, index) => ({
          template_id: newTemplate.id,
          label: item.label,
          category: item.category,
          is_required: item.is_required || false,
          order_index: index,
        }));

        const { error: itemsError } = await supabase
          .from('cleaning_checklist_items')
          .insert(itemsToInsert);

        if (itemsError) {
          console.error(`Error creating items for template "${template.name}":`, itemsError);
          continue;
        }

        console.log(`Created template "${template.name}" with ${template.items.length} items`);
      }
    }

    console.log('Cleaning templates seed completed');
    return { success: true };
  } catch (error) {
    console.error('Error seeding cleaning templates:', error);
    throw error;
  }
}
