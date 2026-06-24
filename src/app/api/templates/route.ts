import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json([]);

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json([]);
    }

    const { data } = await supabase
      .from('cleaning_checklist_templates')
      .select('id, name')
      .eq('organization_id', profile.organization_id)
      .order('name');

    return NextResponse.json(data || []);
  } catch (e) {
    console.error('Templates error:', e);
    return NextResponse.json([]);
  }
}
