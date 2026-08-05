/**
 * Debug endpoint to diagnose property data issues
 */
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: propertyId } = await params

  try {
    const supabase = await createClient()
    console.log('[DEBUG] Starting debug endpoint for:', propertyId)

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    console.log('[DEBUG] User:', { userId: user?.id, userError: userError?.message })

    if (!user) {
      return NextResponse.json({
        error: 'Not authenticated',
        user: null
      })
    }

    // Fetch property with detailed info
    console.log('[DEBUG] Fetching property...')
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, owner_id, owners(id, user_id)')
      .eq('id', propertyId)
      .single()
    console.log('[DEBUG] Property result:', {
      found: !!property,
      error: propertyError?.message,
      code: propertyError?.code
    })

    // Fetch reservations directly
    console.log('[DEBUG] Fetching reservations...')
    const { data: reservations, error: reservationsError } = await supabase
      .from('reservations')
      .select('*')
      .eq('property_id', propertyId)
    console.log('[DEBUG] Reservations result:', {
      count: reservations?.length,
      error: reservationsError?.message,
      code: reservationsError?.code,
      details: reservationsError?.details
    })

    const owners = property ? (Array.isArray(property.owners) ? property.owners[0] : property.owners) : null
    const ownerUserId = owners && typeof owners === 'object' && 'user_id' in owners ? (owners as any).user_id : null

    const response = {
      success: true,
      auth: {
        userId: user.id,
        email: user.email
      },
      property: {
        data: property,
        error: propertyError ? {
          message: propertyError.message,
          code: propertyError.code,
          details: propertyError.details,
          hint: propertyError.hint
        } : null
      },
      reservations: {
        count: reservations?.length || 0,
        data: reservations?.slice(0, 3) || [],
        error: reservationsError ? {
          message: reservationsError.message,
          code: reservationsError.code,
          details: reservationsError.details,
          hint: reservationsError.hint
        } : null
      },
      ownership: property ? {
        ownerUserId,
        userId: user.id,
        matches: ownerUserId === user.id
      } : null
    }

    console.log('[DEBUG] Response:', JSON.stringify(response, null, 2))
    return NextResponse.json(response)
  } catch (error) {
    console.error('[DEBUG] Exception:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.split('\n') : undefined
    }, { status: 500 })
  }
}
