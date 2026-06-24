import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserRole } from '@/lib/auth/getUserAccess';

export async function GET() {
  try {
    const { organizationId } = await getUserRole();
    if (!organizationId) {
      return NextResponse.json([]);
    }

    const supabase = await createClient();
    const { data } = await supabase
      .from('cleaning_checklist_templates')
      .select('id, name')
      .eq('organization_id', organizationId)
      .order('name');

    return NextResponse.json(data || []);
  } catch (e) {
    console.error('Templates error:', e);
    return NextResponse.json([]);
  }
}
