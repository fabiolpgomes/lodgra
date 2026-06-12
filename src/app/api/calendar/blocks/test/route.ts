import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/calendar/blocks/test (use admin client to bypass RLS)
export async function GET(request: NextRequest) {
  try {
    const adminSupabase = createAdminClient()

    // Get first 3 blocks with admin client (bypasses RLS)
    const { data, error } = await adminSupabase
      .from('calendar_blocks')
      .select('id, organization_id, property_id, start_date, end_date')
      .limit(3)

    if (error) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 500 }
      )
    }

    // Check IDs
    const analysis = data?.map(block => ({
      id: block.id,
      id_type: typeof block.id,
      id_length: block.id?.length,
      has_colon: block.id?.includes(':'),
      last_chars: block.id?.slice(-10),
    })) || []

    return NextResponse.json({
      note: 'Admin client (bypasses RLS)',
      count: data?.length,
      blocks: analysis,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
