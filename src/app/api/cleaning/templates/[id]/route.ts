import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/requireRole';
import { createClient } from '@/lib/supabase/server';

interface ChecklistItem {
  label: string;
  category?: string;
  is_required?: boolean;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireRole(['admin', 'gestor']);
    if (!auth.authorized) return auth.response!;

    const supabase = await createClient();
    const { id } = params;

    const { data: template, error } = await supabase
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

    if (error) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('GET /api/cleaning/templates/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireRole(['admin', 'gestor']);
    if (!auth.authorized) return auth.response!;

    const body = await request.json();
    const { name, description, is_active, items } = body;
    const supabase = await createClient();
    const { id } = params;

    // Update template
    const { data: template, error: updateError } = await supabase
      .from('cleaning_checklist_templates')
      .update({
        name,
        description: description || null,
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
    }

    // Update items if provided
    if (items && Array.isArray(items)) {
      // Delete existing items
      const { error: deleteError } = await supabase
        .from('cleaning_checklist_items')
        .delete()
        .eq('template_id', id);

      if (deleteError) {
        console.error('Error deleting items:', deleteError);
        return NextResponse.json({ error: 'Failed to update items' }, { status: 500 });
      }

      // Insert new items
      if (items.length > 0) {
        const itemsToInsert = items.map((item: ChecklistItem, index: number) => ({
          template_id: id,
          label: item.label,
          category: item.category || null,
          is_required: item.is_required || false,
          order_index: index,
        }));

        const { error: insertError } = await supabase
          .from('cleaning_checklist_items')
          .insert(itemsToInsert);

        if (insertError) {
          console.error('Error inserting items:', insertError);
          return NextResponse.json({ error: 'Failed to update items' }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('PUT /api/cleaning/templates/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireRole(['admin', 'gestor']);
    if (!auth.authorized) return auth.response!;

    const supabase = await createClient();
    const { id } = params;

    // Check if template is in use
    const { count: taskCount } = await supabase
      .from('cleaning_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('checklist_template_id', id);

    if (taskCount && taskCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete template that is in use by tasks' },
        { status: 400 }
      );
    }

    // Soft delete: set is_active to false
    const { error } = await supabase
      .from('cleaning_checklist_templates')
      .update({ is_active: false })
      .eq('id', id)
      .eq('organization_id', auth.organizationId);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/cleaning/templates/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
