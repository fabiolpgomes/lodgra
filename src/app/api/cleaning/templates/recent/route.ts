import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/requireRole';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const auth = await requireRole(['admin', 'manager', 'gestor']);
    if (!auth.authorized) return auth.response!;

    const supabase = await createClient();

    const { data: recentTasks } = await supabase
      .from('cleaning_tasks')
      .select('checklist_template_id')
      .eq('organization_id', auth.organizationId)
      .not('checklist_template_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);

    const templateIds = [...new Set(recentTasks?.map((t) => t.checklist_template_id) || [])];

    if (templateIds.length === 0) {
      return NextResponse.json({ templates: [] });
    }

    const { data: templates } = await supabase
      .from('cleaning_checklist_templates')
      .select('id, name, description, is_default')
      .in('id', templateIds)
      .eq('is_active', true);

    return NextResponse.json({ templates: templates || [] });
  } catch (error) {
    console.error('GET /api/cleaning/templates/recent error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
