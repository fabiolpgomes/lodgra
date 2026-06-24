/**
 * POST /api/admin/update-cleaner-roles
 * Update existing users to cleaner role
 * Requires admin/gestor role
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/requireRole';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'gestor']);
    if (!auth.authorized) return auth.response!;

    const supabase = await createClient();

    // Update Cintia Beirão, Nair Limpeza, Dona Rosa to cleaner role
    const names = ['Cintia Beirão', 'Nair Limpeza', 'Dona Rosa'];

    const { data: updated, error } = await supabase
      .from('user_profiles')
      .update({ role: 'cleaner' })
      .eq('organization_id', auth.organizationId)
      .in('full_name', names)
      .select();

    if (error) {
      console.error('Error updating roles:', error);
      return NextResponse.json({ error: 'Failed to update roles' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Cleaner roles updated successfully',
      updated_count: updated?.length || 0,
      updated_users: updated?.map(u => ({ id: u.id, name: u.full_name, role: u.role })) || [],
    });
  } catch (error) {
    console.error('POST /api/admin/update-cleaner-roles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
