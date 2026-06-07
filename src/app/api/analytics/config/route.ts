import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/requireRole';
import { upsertAnalyticsConfig } from '@/lib/database/analytics';

export async function POST(req: NextRequest) {
  try {
    // 1. Validate auth & get organizationId
    const auth = await requireRole(['admin', 'gestor']);
    if (!auth.authorized) return auth.response!;

    const organizationId = auth.organizationId;
    if (!organizationId) {
      return NextResponse.json(
        { error: 'No organization found for user' },
        { status: 400 }
      );
    }

    // 2. Parse & validate GA ID format
    const body = await req.json();
    const { ga_measurement_id } = body;

    if (!ga_measurement_id || !/^G-[A-Z0-9]{10}$/.test(ga_measurement_id)) {
      return NextResponse.json(
        { error: 'Invalid GA measurement ID format. Expected: G-XXXXXXXXXX' },
        { status: 400 }
      );
    }

    // 3-5. Encrypt, save, and log (handled in upsertAnalyticsConfig)
    const config = await upsertAnalyticsConfig(organizationId, ga_measurement_id);

    // 6. Return config (no GA ID exposed)
    return NextResponse.json(
      {
        success: true,
        data: {
          id: config.id,
          tenant_id: config.tenant_id,
          ga_enabled: config.ga_enabled,
          created_at: config.created_at,
          updated_at: config.updated_at
          // NOTE: ga_measurement_id is intentionally NOT returned
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Analytics Config POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(_req: NextRequest) {
  try {
    // 1. Validate auth & get organizationId
    const auth = await requireRole(['admin', 'gestor']);
    if (!auth.authorized) return auth.response!;

    const organizationId = auth.organizationId;
    if (!organizationId) {
      return NextResponse.json(
        { error: 'No organization found for user' },
        { status: 400 }
      );
    }

    // 2. Import and use getAnalyticsConfig (with request cache)
    const { getAnalyticsConfig } = await import('@/lib/database/analytics');

    // 3. Query GA config
    const config = await getAnalyticsConfig(organizationId);

    // 4. Return status
    return NextResponse.json({
      success: true,
      data: {
        ...(config && {
          id: config.id,
          tenant_id: config.tenant_id,
          ga_enabled: config.ga_enabled,
          created_at: config.created_at,
          updated_at: config.updated_at
        }),
        ga_configured: !!config
      }
    });
  } catch (error) {
    console.error('[Analytics Config GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest) {
  try {
    // 1. Validate auth & get organizationId
    const auth = await requireRole(['admin', 'gestor']);
    if (!auth.authorized) return auth.response!;

    const organizationId = auth.organizationId;
    if (!organizationId) {
      return NextResponse.json(
        { error: 'No organization found for user' },
        { status: 400 }
      );
    }

    // Import deleteAnalyticsConfig
    const { deleteAnalyticsConfig } = await import('@/lib/database/analytics');

    // 2-3. Soft delete & log (handled in deleteAnalyticsConfig)
    await deleteAnalyticsConfig(organizationId);

    // 4. Return success
    return NextResponse.json({
      success: true,
      message: 'GA configuration removed. Tracking reverted to Lodgra GA.'
    });
  } catch (error) {
    console.error('[Analytics Config DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
