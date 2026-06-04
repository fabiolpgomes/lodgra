import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth/requireRole';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface ChecklistItem {
  label: string;
  category: string;
  is_required: boolean;
  order_index?: number;
}

/**
 * GET /api/cleaning-checklists
 * List templates for organization with optional property filter
 */
export async function GET(request: NextRequest) {
  const { error: authError, user } = await requireRole(['admin', 'gestor']);
  if (authError) return authError;

  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('property_id');
    const orgId = user?.organization_id;

    let query = supabase
      .from('cleaning_checklist_templates')
      .select('id, name, description, is_active, property_id, created_at, updated_at')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    // Include property-specific + global templates
    if (propertyId) {
      query = query.or(`property_id.eq.${propertyId},property_id.is.null`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    console.error('[Checklists] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cleaning-checklists
 * Create new checklist template
 */
export async function POST(request: NextRequest) {
  const { error: authError, user } = await requireRole(['admin', 'gestor']);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { name, description, property_id, items } = body;

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Template name is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const orgId = user?.organization_id;

    // Create template
    const { data: template, error: templateError } = await supabase
      .from('cleaning_checklist_templates')
      .insert({
        organization_id: orgId,
        name: name.trim(),
        description: description || null,
        property_id: property_id || null,
        is_active: true
      })
      .select()
      .single();

    if (templateError) throw templateError;

    // Create items if provided
    if (items && Array.isArray(items) && items.length > 0) {
      const itemsToInsert = items.map((item: ChecklistItem, index: number) => ({
        template_id: template.id,
        label: item.label || '',
        category: item.category || 'Geral',
        is_required: item.is_required || false,
        order_index: item.order_index ?? index
      }));

      const { error: itemsError } = await supabase
        .from('cleaning_checklist_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }

    return NextResponse.json({ data: template }, { status: 201 });
  } catch (error) {
    console.error('[Checklists] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}
