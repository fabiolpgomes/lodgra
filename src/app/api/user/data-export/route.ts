import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/user/data-export — Export all user personal data as JSON
 * Story 11.3: RGPD Art.20 / LGPD Art.18 — Right to Data Portability
 *
 * Rate limit: 1 export per 24h per user (checked via audit_logs)
 */
export async function POST() {
  try {
    // Authenticate user
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const adminClient = createAdminClient()

    // Rate limit: check for export in last 24h
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recentExports } = await adminClient
      .from('audit_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('action', 'data_export_requested')
      .gte('created_at', twentyFourHoursAgo)
      .limit(1)

    if (recentExports && recentExports.length > 0) {
      return NextResponse.json(
        { error: 'Rate limit: maximum 1 export per 24 hours' },
        { status: 429 }
      )
    }

    // Get user profile
    const { data: profile } = await adminClient
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    const organizationId = profile?.organization_id

    // Fetch all user data in parallel
    const [
      propertiesResult,
      reservationsResult,
      expensesResult,
      ownersResult,
      consentResult,
      auditResult,
    ] = await Promise.all([
      // Properties (org-scoped)
      organizationId
        ? adminClient
            .from('properties')
            .select('*')
            .eq('organization_id', organizationId)
        : Promise.resolve({ data: [] }),

      // Reservations (via property_listings for org)
      organizationId
        ? adminClient
            .from('reservations')
            .select('*, property_listings!inner(property_id, properties!inner(organization_id))')
            .eq('property_listings.properties.organization_id', organizationId)
        : Promise.resolve({ data: [] }),

      // Expenses (org-scoped via properties)
      organizationId
        ? adminClient
            .from('expenses')
            .select('*, properties!inner(organization_id)')
            .eq('properties.organization_id', organizationId)
        : Promise.resolve({ data: [] }),

      // Owners (org-scoped)
      organizationId
        ? adminClient
            .from('owners')
            .select('*')
            .eq('organization_id', organizationId)
        : Promise.resolve({ data: [] }),

      // Consent records (user-scoped)
      adminClient
        .from('consent_records')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),

      // Audit logs (user-scoped and org-isolated if applicable)
      organizationId
        ? adminClient
            .from('audit_logs')
            .select('*')
            .eq('user_id', userId)
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false })
            .limit(500)
        : adminClient
            .from('audit_logs')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(500),
    ])

    // Build export payload
    const exportData = {
      export_date: new Date().toISOString(),
      export_version: '1.0',
      user: {
        id: profile?.id,
        email: profile?.email,
        full_name: profile?.full_name,
        role: profile?.role,
        preferred_locale: profile?.preferred_locale,
        created_at: profile?.created_at,
      },
      properties: propertiesResult.data || [],
      reservations: (reservationsResult.data || []).map((r: Record<string, unknown>) => {
        const { property_listings, ...rest } = r as Record<string, unknown>
        return rest
      }),
      expenses: (expensesResult.data || []).map((e: Record<string, unknown>) => {
        const { properties, ...rest } = e as Record<string, unknown>
        return rest
      }),
      owners: ownersResult.data || [],
      consent_records: consentResult.data || [],
      audit_logs: auditResult.data || [],
    }

    // Log the export request
    await adminClient.from('audit_logs').insert({
      user_id: userId,
      action: 'data_export_requested',
      details: { tables_exported: Object.keys(exportData).filter(k => k !== 'export_date' && k !== 'export_version' && k !== 'user') },
    })

    // Return as downloadable JSON
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="lodgra-data-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (error) {
    console.error('Data export error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
