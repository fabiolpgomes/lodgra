import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/requireRole'

// GET /api/calendar/blocks/debug
export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'gestor'])
    if (!auth.authorized) return auth.response!

    const supabase = await createClient()

    // Get first 5 blocks with all fields
    const { data, error } = await supabase
      .from('calendar_blocks')
      .select('*')
      .limit(5)

    if (error) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
    }

    // Analyze each block
    const analysis = data?.map(block => ({
      id_raw: block.id,
      id_length: block.id?.length,
      id_contains_colon: block.id?.includes(':'),
      id_ends_with: block.id?.slice(-5),
      organization_id: block.organization_id,
      property_id: block.property_id,
      start_date: block.start_date,
      end_date: block.end_date,
    })) || []

    return NextResponse.json({
      total_blocks: data?.length,
      blocks: analysis,
      raw_first_block: data?.[0],
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
