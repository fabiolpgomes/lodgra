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
      .is('deleted_at', null)
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

export async function POST(req: NextRequest) {
  try {
    console.log('[Analytics Test POST] Starting connection test');

    // Check auth
    const auth = await requireRole(['admin', 'gestor']);
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const organizationId = auth.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: 'No organization ID' }, { status: 400 });
    }

    // Get GA Measurement ID
    const { getGAMeasurementId } = await import('@/lib/database/analytics');
    const gaMeasurementId = await getGAMeasurementId(organizationId);

    if (!gaMeasurementId) {
      return NextResponse.json({
        error: 'No GA Measurement ID configured',
        success: false
      }, { status: 400 });
    }

    console.log('[Analytics Test POST] Testing with GA ID:', gaMeasurementId.substring(0, 5) + '***');

    // Send test event to Google Analytics
    const testEvent = {
      measurement_id: gaMeasurementId,
      api_secret: process.env.GOOGLE_ANALYTICS_API_SECRET,
      events: [{
        name: 'test_connection',
        params: {
          source: 'lodgra-settings',
          timestamp: new Date().toISOString()
        }
      }]
    };

    const gaResponse = await fetch('https://www.google-analytics.com/mp/collect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testEvent)
    });

    console.log('[Analytics Test POST] GA response status:', gaResponse.status);

    if (!gaResponse.ok) {
      console.error('[Analytics Test POST] GA error:', await gaResponse.text());
      return NextResponse.json({
        error: 'Failed to send test event to Google Analytics',
        success: false,
        gaStatus: gaResponse.status
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Test event sent to Google Analytics. Check your GA account in 5-10 seconds.',
      gaMeasurementId: gaMeasurementId.substring(0, 5) + '***'
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Analytics Test POST] Error:', errorMsg, error);
    return NextResponse.json({
      error: 'Test connection failed',
      details: errorMsg,
      success: false
    }, { status: 500 });
  }
}
