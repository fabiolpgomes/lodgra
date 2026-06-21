import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/requireRole';
import { createClient } from '@/lib/supabase/server';

interface ChecklistItem {
  label: string;
  category?: string;
  is_required?: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'gestor']);
    if (!auth.authorized) return auth.response!;

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const propertyId = searchParams.get('propertyId');
    const isGlobal = searchParams.get('isGlobal') === 'true';

    let query = supabase
      .from('cleaning_checklist_templates')
      .select('*')
      .eq('organization_id', auth.organizationId)
      .eq('is_active', true);

    if (propertyId) {
      query = query.or(`property_id.eq.${propertyId},is_global.eq.true`);
    } else if (isGlobal) {
      query = query.eq('is_global', true);
    }

    const { data: templates, error } = await query.order('name');

    if (error) {
      console.error('Error fetching templates:', error);
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('GET /api/cleaning/templates error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'gestor']);
    if (!auth.authorized) return auth.response!;

    const body = await request.json();
    const { name, description, property_id, is_global, items } = body;

    if (!name) {
      return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Create template
    const { data: template, error: templateError } = await supabase
      .from('cleaning_checklist_templates')
      .insert({
        organization_id: auth.organizationId,
        property_id: property_id || null,
        name,
        description: description || null,
        is_global: is_global || false,
        is_active: true,
      })
      .select()
      .single();

    if (templateError) {
      console.error('Error creating template:', templateError);
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    }

    // Create template items if provided
    if (items && Array.isArray(items) && items.length > 0) {
      const itemsToInsert = items.map((item: ChecklistItem, index: number) => ({
        template_id: template.id,
        label: item.label,
        category: item.category || null,
        is_required: item.is_required || false,
        order_index: index,
      }));

      const { error: itemsError } = await supabase
        .from('cleaning_checklist_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('Error creating template items:', itemsError);
        return NextResponse.json({ error: 'Failed to create template items' }, { status: 500 });
      }
    }

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('POST /api/cleaning/templates error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
