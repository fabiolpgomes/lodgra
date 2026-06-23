/**
 * GET manager's properties for task creation
 * Returns all properties for the current organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/requireRole';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'manager', 'gestor']);
    if (!auth.authorized) return auth.response!;

    const supabase = await createClient();

    const { data: properties, error } = await supabase
      .from('properties')
      .select('id, name, address')
      .eq('organization_id', auth.organizationId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching properties:', error);
      return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 });
    }

    return NextResponse.json(properties || []);
  } catch (error) {
    console.error('GET /api/manager/properties error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
