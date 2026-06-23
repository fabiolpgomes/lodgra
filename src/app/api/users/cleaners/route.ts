/**
 * GET /api/users/cleaners
 * Returns list of cleaners (responsáveis de limpeza) for the organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/requireRole';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'manager', 'gestor']);
    if (!auth.authorized) return auth.response!;

    const supabase = await createClient();

    // Get all users with role 'cleaner' for this organization
    const { data: cleaners, error } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, phone_number, role')
      .eq('organization_id', auth.organizationId)
      .eq('role', 'cleaner')
      .order('full_name', { ascending: true });

    if (error) {
      console.error('Error fetching cleaners:', error);
      return NextResponse.json({ error: 'Failed to fetch cleaners' }, { status: 500 });
    }

    return NextResponse.json(cleaners || []);
  } catch (error) {
    console.error('GET /api/users/cleaners error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
