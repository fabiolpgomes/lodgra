import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/requireRole';
import { getGAMeasurementId } from '@/lib/database/analytics';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(_req: NextRequest) {
  try {
    // 1. Validate auth & get organizationId
    const auth = await requireRole(['admin', 'gestor']);
    if (!auth.authorized) return auth.response!;

    const tenantId = auth.organizationId;
    if (!tenantId) {
      return NextResponse.json(
        { error: 'No organization found for user' },
        { status: 400 }
      );
    }

    // 2. Get GA config from database
    const gaId = await getGAMeasurementId(tenantId);
    if (!gaId) {
      return NextResponse.json(
        { error: 'GA not configured. Please set up GA ID first.' },
        { status: 400 }
      );
    }

    // 4. Generate test event ID
    const testEventId = `test_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const testFiredAt = new Date().toISOString();

    // 5. Log test event
    const supabase = createAdminClient();
    await supabase.from('analytics_test_events').insert({
      tenant_id: tenantId,
      event_id: testEventId,
      ga_measurement_id: gaId,
      test_fired_at: testFiredAt,
      status: 'pending'
    });

    // 6. Return test event ID + instructions
    return NextResponse.json({
      success: true,
      data: {
        test_event_id: testEventId,
        test_fired_at: testFiredAt,
        instructions: 'Check your Google Analytics in 5-10 seconds for event: lodgra_config_test'
      }
    });
  } catch (error) {
    console.error('[Analytics Test] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
