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
 * GET /api/cleaning-checklists/[id]
 * Get template with its items
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireRole(['admin', 'gestor']);
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const supabase = createAdminClient();
    const orgId = auth.organizationId;

    const { data: template, error: templateError } = await supabase
      .from('cleaning_checklist_templates')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (templateError) {
      if (templateError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }
      throw templateError;
    }

    // Get items
    const { data: items, error: itemsError } = await supabase
      .from('cleaning_checklist_items')
      .select('*')
      .eq('template_id', id)
      .order('order_index', { ascending: true });

    if (itemsError) throw itemsError;

    return NextResponse.json({ data: { ...template, items } });
  } catch (error) {
    console.error('[Checklists] GET [id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/cleaning-checklists/[id]
 * Update template and items
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: templateId } = await params;
  const auth = await requireRole(['admin', 'gestor']);
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, description, property_id, items } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Template name is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const orgId = auth.organizationId;

    // Update template
    const { data: template, error: templateError } = await supabase
      .from('cleaning_checklist_templates')
      .update({
        name: name.trim(),
        description: description || null,
        property_id: property_id || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (templateError) throw templateError;

    // Update items if provided
    if (items && Array.isArray(items)) {
      // Delete old items
      await supabase
        .from('cleaning_checklist_items')
        .delete()
        .eq('template_id', templateId);

      // Insert new items
      if (items.length > 0) {
        const itemsToInsert = items.map((item: ChecklistItem, index: number) => ({
          template_id: templateId,
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
    }

    return NextResponse.json({ data: template });
  } catch (error) {
    console.error('[Checklists] PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cleaning-checklists/[id]
 * Delete template and its items
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireRole(['admin', 'gestor']);
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const supabase = createAdminClient();
    const orgId = auth.organizationId;

    // Items are auto-deleted via ON DELETE CASCADE
    const { error: deleteError } = await supabase
      .from('cleaning_checklist_templates')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ data: { id: id } });
  } catch (error) {
    console.error('[Checklists] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
