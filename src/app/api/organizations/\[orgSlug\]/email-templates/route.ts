import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

/**
 * Fetch email template + branding for internal use (e.g., booking confirmation)
 * Returns combined template config with organization branding
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const { orgSlug } = await params

  try {
    const client = createClient()

    // Fetch organization by slug
    const { data: org, error: orgError } = await client
      .from('organizations')
      .select('id, name')
      .eq('slug', orgSlug)
      .single()

    if (orgError || !org) {
      return NextResponse.json({ message: 'Organization not found' }, { status: 404 })
    }

    // Fetch email template
    const { data: template, error: templateError } = await client
      .from('organization_email_templates')
      .select('*')
      .eq('organization_id', org.id)
      .single()

    // Fetch branding
    const { data: branding } = await client
      .from('organization_branding')
      .select('logo_url, primary_color, secondary_color, accent_color')
      .eq('organization_id', org.id)
      .single()

    // Return template with defaults if not found
    const emailTemplate = template || {
      confirmation_subject: `Booking Confirmation - ${org.name}`,
      confirmation_message: null,
      from_email: 'noreply@lodgra.io',
      from_name: org.name,
      reply_to_email: null,
      include_company_logo: true,
      footer_text: null,
    }

    // Merge with branding
    const response = {
      ...emailTemplate,
      branding: branding || {
        logo_url: null,
        primary_color: '#1E40AF',
        secondary_color: '#6B7280',
        accent_color: '#FFC000',
      },
      organization: {
        id: org.id,
        name: org.name,
        slug: orgSlug,
      },
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      },
    })
  } catch (error) {
    console.error('Error fetching email template:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    )
  }
}
