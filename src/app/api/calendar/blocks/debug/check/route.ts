import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/calendar/blocks/debug/check?id={blockId}
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id parameter required' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // Check if block exists (admin, no RLS)
    const { data: block, error: blockError } = await adminSupabase
      .from('calendar_blocks')
      .select('*')
      .eq('id', id)
      .single()

    // Check how many blocks exist in total
    const { data: allBlocks, error: allError } = await adminSupabase
      .from('calendar_blocks')
      .select('id, organization_id, start_date, end_date')
      .limit(5)

    return NextResponse.json({
      searchingFor: id,
      blockFound: !!block,
      blockData: block,
      blockError: blockError ? { message: blockError.message, code: blockError.code } : null,
      totalBlocksInDb: allBlocks?.length || 0,
      sampleBlocks: allBlocks?.map(b => ({
        id: b.id,
        org_id: b.organization_id,
        dates: `${b.start_date} to ${b.end_date}`,
      })) || [],
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
