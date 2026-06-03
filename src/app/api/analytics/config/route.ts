import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // TODO: Story 1.3 Implementation
    // 1. Validate session & get tenant_id
    // 2. Parse & validate GA ID format (G-[A-Z0-9]{10})
    // 3. Encrypt GA ID using encryptGAId()
    // 4. Save to database (insert or update)
    // 5. Log audit event
    // 6. Return config (no GA ID exposed)

    const body = await req.json();
    const { ga_measurement_id } = body;

    if (!ga_measurement_id || !/^G-[A-Z0-9]{10}$/.test(ga_measurement_id)) {
      return NextResponse.json(
        { error: 'Invalid GA measurement ID format' },
        { status: 400 }
      );
    }

    // Placeholder response
    return NextResponse.json(
      {
        success: true,
        data: {
          id: 'placeholder-id',
          tenant_id: 'placeholder-tenant',
          ga_enabled: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
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

export async function GET(req: NextRequest) {
  try {
    // TODO: Story 1.4 Implementation
    // 1. Validate session & get tenant_id
    // 2. Query GA config from database (cached, 1h TTL)
    // 3. Return config status (no GA ID exposed)
    // 4. If no config: return {ga_configured: false}

    return NextResponse.json({
      success: true,
      data: {
        ga_configured: false
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

export async function DELETE(req: NextRequest) {
  try {
    // TODO: Story 1.5 Implementation
    // 1. Validate session & get tenant_id
    // 2. Soft delete GA config (set deleted_at, ga_enabled = false)
    // 3. Log audit event
    // 4. Return success message

    return NextResponse.json({
      success: true,
      message: 'GA configuration removed'
    });
  } catch (error) {
    console.error('[Analytics Config DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
