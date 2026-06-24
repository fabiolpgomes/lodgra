import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/requireRole';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'manager', 'gestor']);
    if (!auth.authorized) return auth.response!;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('cleaning_checklist_templates')
      .select('id, name')
      .eq('organization_id', auth.organizationId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error:', error);
      return NextResponse.json([], { status: 200 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json([], { status: 200 });
  }
}
