import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/requireRole';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(['admin', 'manager', 'gestor']);
    if (!auth.authorized) return auth.response!;

    const supabase = await createClient();
    const { id } = await params;

    // Get template to find property_id
    const { data: template, error: getError } = await supabase
      .from('cleaning_checklist_templates')
      .select('property_id, is_global')
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .single();

    if (getError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Clear previous defaults
    if (template.property_id) {
      // Clear default for this property
      await supabase
        .from('cleaning_checklist_templates')
        .update({ is_default: false })
        .eq('property_id', template.property_id)
        .eq('organization_id', auth.organizationId);
    } else if (template.is_global) {
      // Clear global default
      await supabase
        .from('cleaning_checklist_templates')
        .update({ is_default: false })
        .eq('is_global', true)
        .eq('organization_id', auth.organizationId);
    }

    // Set this template as default
    const { data: updated, error: updateError } = await supabase
      .from('cleaning_checklist_templates')
      .update({ is_default: true })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Failed to set default' }, { status: 500 });
    }

    return NextResponse.json({ template: updated });
  } catch (error) {
    console.error('POST /api/cleaning/templates/[id]/set-default error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
