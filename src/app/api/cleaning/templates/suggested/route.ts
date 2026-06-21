import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/requireRole';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'gestor']);
    if (!auth.authorized) return auth.response!;

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');

    if (!propertyId) {
      return NextResponse.json({ templates: [] });
    }

    const { data: recentTasks } = await supabase
      .from('cleaning_tasks')
      .select('checklist_template_id, created_at')
      .eq('organization_id', auth.organizationId)
      .eq('property_id', propertyId)
      .not('checklist_template_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5);

    const templateIds = recentTasks?.map((t) => t.checklist_template_id) || [];

    if (templateIds.length === 0) {
      const { data: defaultTemplates } = await supabase
        .from('cleaning_checklist_templates')
        .select('id, name, is_default')
        .eq('organization_id', auth.organizationId)
        .eq('is_default', true)
        .eq('is_active', true)
        .limit(3);

      return NextResponse.json({ templates: defaultTemplates || [] });
    }

    const { data: templates } = await supabase
      .from('cleaning_checklist_templates')
      .select('id, name, is_default')
      .in('id', templateIds)
      .eq('is_active', true);

    return NextResponse.json({ templates: templates || [] });
  } catch (error) {
    console.error('GET /api/cleaning/templates/suggested error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
