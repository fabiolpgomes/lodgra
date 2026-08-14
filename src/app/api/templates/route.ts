import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth/requireRole';

export async function GET() {
  try {
    const auth = await requireRole(['admin', 'manager', 'gestor', 'viewer']);
    if (!auth.authorized) return auth.response!;
    if (!auth.organizationId) {
      return NextResponse.json({ error: 'Organização não configurada' }, { status: 409 });
    }

    const admin = await createAdminClient();

    const { data, error } = await admin
      .from('cleaning_checklist_templates')
      .select('id, name, description, is_active, items:cleaning_checklist_items(*)')
      .eq('organization_id', auth.organizationId)
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
