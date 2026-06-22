import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/requireRole';
import { createClient } from '@/lib/supabase/server';

interface ChecklistItem {
  label: string;
  category?: string;
  is_required?: boolean;
  order_index?: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(['admin', 'manager', 'gestor']);
    if (!auth.authorized) return auth.response!;

    const body = await request.json();
    const { name, property_id } = body;

    const supabase = await createClient();
    const { id } = await params;

    // Get original template and items
    const { data: original, error: getError } = await supabase
      .from('cleaning_checklist_templates')
      .select(
        `
        *,
        items:cleaning_checklist_items(*)
      `
      )
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .single();

    if (getError || !original) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Create new template
    const { data: newTemplate, error: templateError } = await supabase
      .from('cleaning_checklist_templates')
      .insert({
        organization_id: auth.organizationId,
        property_id: property_id || null,
        name: name || `${original.name} (Cópia)`,
        description: original.description,
        is_global: property_id ? false : original.is_global,
        is_active: true,
      })
      .select()
      .single();

    if (templateError) {
      return NextResponse.json({ error: 'Failed to duplicate template' }, { status: 500 });
    }

    // Duplicate items
    if (original.items && original.items.length > 0) {
      const itemsToInsert = original.items.map((item: ChecklistItem) => ({
        template_id: newTemplate.id,
        label: item.label,
        category: item.category,
        is_required: item.is_required,
        order_index: item.order_index,
      }));

      const { error: itemsError } = await supabase
        .from('cleaning_checklist_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('Error duplicating items:', itemsError);
        return NextResponse.json({ error: 'Failed to duplicate items' }, { status: 500 });
      }
    }

    return NextResponse.json({ template: newTemplate }, { status: 201 });
  } catch (error) {
    console.error('POST /api/cleaning/templates/[id]/duplicate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
