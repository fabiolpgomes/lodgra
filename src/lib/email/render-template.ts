import Handlebars from 'handlebars'
import mjml2html from 'mjml'
import * as fs from 'fs'
import * as path from 'path'
import { BOOKING_STANDARD_VERSION, getBookingConfirmationSubject, getBookingEmailCopy } from './booking-locale'
import { generateUnsubscribeToken as createSignedUnsubscribeToken } from './security'

interface EmailVariables {
  customerName: string
  reservationNumber?: string
  nights?: string
  guestCount?: string
  propertyName: string
  checkInDate: string
  checkOutDate: string
  totalPrice: string
  currency: string
  bookingUrl: string
  unsubscribeUrl: string
  templateVersion: string
  copy: {
    previewText: string
    greeting: string
    intro: string
    reservationLabel: string
    nightsLabel: string
    guestsLabel: string
    propertyLabel: string
    checkInLabel: string
    checkOutLabel: string
    totalPriceLabel: string
    ctaLabel: string
    supportText: string
    rightsText: string
    unsubscribeText: string
  }
  [key: string]: unknown
}

// Cache compiled template
let compiledTemplate: HandlebarsTemplateDelegate | null = null

/**
 * Load and compile MJML email template
 * Caches compiled template for performance
 */
function getCompiledTemplate(): HandlebarsTemplateDelegate {
  if (compiledTemplate) {
    return compiledTemplate
  }

  const templatePath = path.join(process.cwd(), 'src/lib/email/templates/booking-confirmation.mjml')
  const templateContent = fs.readFileSync(templatePath, 'utf-8')

  compiledTemplate = Handlebars.compile(templateContent)
  return compiledTemplate
}

/**
 * Render email template with variables
 * Returns HTML ready for email sending
 */
export async function renderEmailTemplate(
  variables: EmailVariables,
): Promise<string> {
  try {
    // Get compiled template
    const template = getCompiledTemplate()

    // Render MJML with Handlebars.
    // Handlebars escapes interpolated values by default, which is enough here.
    const mjmlContent = template(variables)

    // Convert MJML to HTML
    const { html, errors = [] } = (await mjml2html(mjmlContent)) as {
      html: string
      errors?: Array<unknown>
    }

    if (errors.length > 0) {
      console.warn('MJML rendering warnings:', errors)
    }

    return html
  } catch (error) {
    console.error('Error rendering email template:', error)
    throw new Error('Failed to render email template')
  }
}

export function generateUnsubscribeToken(organizationId: string, customerEmail: string): string {
  return createSignedUnsubscribeToken(organizationId, customerEmail)
}

/**
 * Test if email rendering works
 */
export async function testEmailRendering(): Promise<void> {
  const copy = getBookingEmailCopy('pt-PT')
  const testVariables: EmailVariables = {
    customerName: 'John Doe',
    reservationNumber: 'AHS-TEST-001',
    nights: '3',
    propertyName: 'Sunny Beach Resort',
    checkInDate: '25 de maio de 2026',
    checkOutDate: '30 de maio de 2026',
    totalPrice: '1250.00',
    currency: 'EUR',
    bookingUrl: 'https://example.com/bookings/123',
    unsubscribeUrl: 'https://lodgra.io/unsubscribe?token=abc123',
    templateVersion: BOOKING_STANDARD_VERSION,
    copy,
    subject: getBookingConfirmationSubject('Sunny Beach Resort', 'pt-PT'),
    organizationName: 'Sunny Beach Resort',
    logoUrl: null,
    replyToEmail: 'support@example.com',
    footerText: 'Obrigado por reservar connosco!',
    year: new Date().getFullYear().toString(),
    primaryColor: '#1E40AF',
  }

  const html = await renderEmailTemplate(testVariables)
  console.log('✅ Email rendering test passed')
  console.log('HTML length:', html.length)
}
