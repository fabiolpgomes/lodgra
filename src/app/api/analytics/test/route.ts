import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/requireRole';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(_req: NextRequest) {
  try {
    console.log('[Analytics Test] Starting test endpoint');

    // Test 1: Check auth
    const auth = await requireRole(['admin', 'gestor']);
    console.log('[Analytics Test] Auth check:', { authorized: auth.authorized, organizationId: auth.organizationId });

    if (!auth.authorized) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const organizationId = auth.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: 'No organization ID' }, { status: 400 });
    }

    // Test 2: Check Supabase connection
    const supabase = createAdminClient();
    console.log('[Analytics Test] Supabase client created');

    // Test 3: Query the table directly
    const { data, error } = await supabase
      .from('organization_analytics_config')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('deleted_at', null)
      .maybeSingle();

    console.log('[Analytics Test] Query result:', { data, error });

    if (error) {
      return NextResponse.json({
        error: 'Database query failed',
        details: error.message,
        code: error.code
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      organizationId,
      config: data,
      message: 'Test successful'
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Analytics Test] Error:', errorMsg, error);
    return NextResponse.json({
      error: 'Test failed',
      details: errorMsg
    }, { status: 500 });
  }
}
