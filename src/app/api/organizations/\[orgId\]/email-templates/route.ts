import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/requireRole'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params

  // Verify admin access
  const auth = await requireRole(['admin'], orgId)
  if (auth.response) return auth.response

  try {
    const client = createAdminClient()

    // Fetch email template
    const { data: template, error } = await client
      .from('organization_email_templates')
      .select('*')
      .eq('organization_id', orgId)
      .single()

    // Return defaults if no template exists
    if (error && error.code === 'PGRST116') {
      return NextResponse.json({
        confirmation_subject: 'Booking Confirmation',
        confirmation_message: null,
        from_email: 'noreply@lodgra.io',
        from_name: null,
        reply_to_email: null,
        include_company_logo: true,
        footer_text: null,
      })
    }

    if (error) {
      return NextResponse.json(
        { message: 'Failed to fetch email template' },
        { status: 500 },
      )
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('Error fetching email template:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params

  // Verify admin access
  const auth = await requireRole(['admin'], orgId)
  if (auth.response) return auth.response

  try {
    const body = await request.json()
    const client = createAdminClient()

    // Validate subject length
    if (body.confirmation_subject && body.confirmation_subject.length > 100) {
      return NextResponse.json(
        { message: 'Subject must be 100 characters or less' },
        { status: 400 },
      )
    }

    // Validate message length
    if (body.confirmation_message && body.confirmation_message.length > 5000) {
      return NextResponse.json(
        { message: 'Message must be 5000 characters or less' },
        { status: 400 },
      )
    }

    // Validate from_email format (basic)
    if (body.from_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(body.from_email)) {
        return NextResponse.json(
          { message: 'Invalid email format for from_email' },
          { status: 400 },
        )
      }

      // Prevent spoofing: only allow lodgra.io subdomains or org's own domain
      // TODO: Implement proper domain verification via SPF/DKIM (R1 mitigation)
      if (!body.from_email.includes('@') || !body.from_email.toLowerCase().includes('lodgra.io')) {
        // Allow custom domains only after verification
        // For now, restrict to lodgra.io
        return NextResponse.json(
          { message: 'Custom domains require verification. Use noreply@lodgra.io for now.' },
          { status: 400 },
        )
      }
    }

    // Validate reply_to_email if provided
    if (body.reply_to_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(body.reply_to_email)) {
        return NextResponse.json(
          { message: 'Invalid email format for reply_to_email' },
          { status: 400 },
        )
      }
    }

    // Get or create template
    const { data: existing } = await client
      .from('organization_email_templates')
      .select('id')
      .eq('organization_id', orgId)
      .single()

    let result
    if (existing) {
      // Update existing
      const { data, error } = await client
        .from('organization_email_templates')
        .update({
          confirmation_subject: body.confirmation_subject ?? undefined,
          confirmation_message: body.confirmation_message ?? undefined,
          from_email: body.from_email ?? undefined,
          from_name: body.from_name ?? undefined,
          reply_to_email: body.reply_to_email ?? undefined,
          include_company_logo: body.include_company_logo ?? undefined,
          footer_text: body.footer_text ?? undefined,
        })
        .eq('organization_id', orgId)
        .select()
        .single()

      if (error) {
        console.error('Error updating email template:', error)
        return NextResponse.json(
          { message: 'Failed to update email template' },
          { status: 500 },
        )
      }
      result = data
    } else {
      // Create new
      const { data, error } = await client
        .from('organization_email_templates')
        .insert({
          organization_id: orgId,
          confirmation_subject: body.confirmation_subject ?? 'Booking Confirmation',
          confirmation_message: body.confirmation_message ?? null,
          from_email: body.from_email ?? 'noreply@lodgra.io',
          from_name: body.from_name ?? null,
          reply_to_email: body.reply_to_email ?? null,
          include_company_logo: body.include_company_logo ?? true,
          footer_text: body.footer_text ?? null,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating email template:', error)
        return NextResponse.json(
          { message: 'Failed to create email template' },
          { status: 500 },
        )
      }
      result = data
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in email template PATCH:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    )
  }
}
