import { NextRequest, NextResponse } from 'next/server'
import { sendEmailFromTemplate } from '@/lib/email/service'
import { EmailTemplate } from '@/lib/email/templates'
import { seriousIssueReviewTemplate, SeriousIssueReviewEmailData } from '@/lib/email/serious-issue-review'
import { seriousIssueDecisionTemplate, SeriousIssueDecisionEmailData } from '@/lib/email/serious-issue-decision'
import { seriousIssueConfirmationTemplate, SeriousIssueConfirmationEmailData } from '@/lib/email/serious-issue-confirmation'

type EmailData = SeriousIssueReviewEmailData | SeriousIssueDecisionEmailData | SeriousIssueConfirmationEmailData | Record<string, any>

interface SendEmailRequest {
  to: string
  templateId: string
  data: EmailData
}

export async function POST(request: NextRequest) {
  try {
    const body: SendEmailRequest = await request.json()
    const { to, templateId, data } = body

    if (!to || !templateId) {
      return NextResponse.json(
        { error: 'Missing required fields: to, templateId' },
        { status: 400 }
      )
    }

    let template: EmailTemplate

    // Map template IDs to templates
    switch (templateId) {
      case 'serious-issue-review':
        template = seriousIssueReviewTemplate(data as SeriousIssueReviewEmailData)
        break

      case 'serious-issue-decision':
        template = seriousIssueDecisionTemplate(data as SeriousIssueDecisionEmailData)
        break

      case 'serious-issue-confirmation':
        template = seriousIssueConfirmationTemplate(data as SeriousIssueConfirmationEmailData)
        break

      default:
        return NextResponse.json(
          { error: `Unknown template ID: ${templateId}` },
          { status: 400 }
        )
    }

    // Send email
    await sendEmailFromTemplate(to, template)

    return NextResponse.json({
      success: true,
      message: `Email sent to ${to}`,
    })
  } catch (error) {
    console.error('[email/send] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}
