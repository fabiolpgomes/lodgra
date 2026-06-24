import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const FIXED_ORG_ID = '00000000-0000-0000-0000-000000000001';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data } = await supabase
      .from('cleaning_checklist_templates')
      .select('id, name')
      .eq('organization_id', FIXED_ORG_ID)
      .order('name');

    return NextResponse.json(data || []);
  } catch (e) {
    console.error('Error:', e);
    return NextResponse.json([]);
  }
}
