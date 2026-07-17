import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import { propertyValidator } from '@/lib/google/property-validator'
import { autoFixer, type FixResult } from '@/lib/google/auto-fixer'

interface ValidationRequest {
  propertyId: string
  autoFix?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuth(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: ValidationRequest = await request.json()
    const { propertyId, autoFix = false } = body

    if (!propertyId) {
      return NextResponse.json({ error: 'Property ID is required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      {
        auth: { persistSession: false },
      }
    )

    // Get user's organization
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', userId)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const organizationId = userProfile.organization_id

    // Fetch property data
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .eq('organization_id', organizationId)
      .single()

    if (propError || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // Validate property
    const validation = await propertyValidator.validateProperty(propertyId, property)

    // Get auto-fix suggestions
    const suggestions = autoFixer.getAutoFixSuggestions(propertyId, validation.issues)

    // Apply auto-fixes if requested
    let appliedFixes: FixResult[] = []
    if (autoFix && validation.issues.length > 0) {
      appliedFixes = await autoFixer.autoFixProperty(propertyId, property)

      // If fixes were applied, update property in database
      if (appliedFixes.length > 0 && appliedFixes.some((f) => f.applied)) {
        const { error: updateError } = await supabase
          .from('properties')
          .update(property)
          .eq('id', propertyId)

        if (updateError) {
          console.error('Failed to apply auto-fixes:', updateError)
        }
      }
    }

    // Store validation log
    const { error: logError } = await supabase.from('google_validation_logs').insert({
      organization_id: organizationId,
      property_id: propertyId,
      status: validation.indexationStatus,
      issues: validation.issues,
      auto_fixes_applied: appliedFixes.filter((f) => f.applied).length,
      auto_fixes_data: appliedFixes,
      validation_type: 'manual',
    })

    if (logError) {
      console.error('Failed to store validation log:', logError)
    }

    return NextResponse.json({
      validation,
      suggestions,
      appliedFixes: appliedFixes.filter((f) => f.applied),
      totalIssues: validation.issues.length,
      criticalIssues: validation.issues.filter((i) => i.severity === 'critical').length,
      highIssues: validation.issues.filter((i) => i.severity === 'high').length,
    })
  } catch (error) {
    console.error('[API] Validation error:', error)
    return NextResponse.json({ error: 'Validation failed' }, { status: 500 })
  }
}

// GET: Fetch validation history for a property
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuth(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      {
        auth: { persistSession: false },
      }
    )

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', userId)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const propertyId = searchParams.get('propertyId')
    const limit = parseInt(searchParams.get('limit') || '10')

    let query = supabase
      .from('google_validation_logs')
      .select('*')
      .eq('organization_id', userProfile.organization_id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (propertyId) {
      query = query.eq('property_id', propertyId)
    }

    const { data: logs, error } = await query

    if (error) {
      console.error('[API] Error fetching validation history:', error)
      return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
    }

    return NextResponse.json({
      data: logs,
      count: logs?.length || 0,
    })
  } catch (error) {
    console.error('[API] History fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
