import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const FIXED_ORG_ID = '00000000-0000-0000-0000-000000000001';

export async function GET() {
  try {
    const admin = createAdminClient();

    const { data, error } = await admin
      .from('cleaning_checklist_templates')
      .select('id, name')
      .eq('organization_id', FIXED_ORG_ID)
      .order('name');

    if (error) {
      console.error('Query error:', error);
      return NextResponse.json([]);
    }

    return NextResponse.json(data || []);
  } catch (e) {
    console.error('Error:', e);
    return NextResponse.json([]);
  }
}
