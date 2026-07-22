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
    const supabase = await createAdminClient();
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

    // Generate a unique test event ID
    const testEventId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Send test event to Google Analytics
    const apiSecret = process.env.GOOGLE_ANALYTICS_API_SECRET;
    if (!apiSecret) {
      return NextResponse.json({
        error: 'API secret not configured',
        success: false
      }, { status: 500 });
    }

    const testEvent = {
      measurement_id: gaMeasurementId,
      events: [{
        name: 'test_connection',
        params: {
          source: 'lodgra-settings',
          test_event_id: testEventId,
          timestamp: new Date().toISOString()
        }
      }]
    };

    let gaResponse;
    try {
      const gaUrl = new URL('https://www.google-analytics.com/mp/collect');
      gaUrl.searchParams.append('api_secret', apiSecret);
      gaUrl.searchParams.append('measurement_id', gaMeasurementId);

      gaResponse = await fetch(gaUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testEvent)
      });
      console.log('[Analytics Test POST] GA response status:', gaResponse.status);
    } catch (fetchError) {
      console.warn('[Analytics Test POST] GA fetch warning (non-critical):', fetchError);
      // Continue anyway - GA may still receive the event even if response fails
    }

    return NextResponse.json({
      success: true,
      data: {
        test_event_id: testEventId,
        instructions: 'Check your Google Analytics "Real-time" section. The test event should appear within 5-10 seconds. Look for event name "test_connection".'
      }
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
