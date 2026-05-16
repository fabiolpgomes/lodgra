import { EmailTemplate } from './templates'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM || 'billing@lodgra.com'
const RESEND_API_URL = 'https://api.resend.com/emails'

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text: string
  replyTo?: string
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not configured, skipping email send')
    return
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        reply_to: options.replyTo || EMAIL_FROM,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('[email] Failed to send email:', error)
      throw new Error(`Failed to send email: ${error.message}`)
    }

    const result = await response.json()
    console.log(`[email] Sent to ${options.to} (ID: ${result.id})`)
  } catch (error) {
    console.error('[email] Error sending email:', error)
    throw error
  }
}

export async function sendEmailFromTemplate(
  to: string,
  template: EmailTemplate
): Promise<void> {
  await sendEmail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
  })
}
