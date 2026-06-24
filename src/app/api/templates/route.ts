import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerSession } from '@/lib/auth/session';

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json([]);
    }

    const supabase = await createClient();

    // Get user's organization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', session.user.id)
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
