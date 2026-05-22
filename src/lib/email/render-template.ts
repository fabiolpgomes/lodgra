import Handlebars from 'handlebars'
import mjml2html from 'mjml'
import * as fs from 'fs'
import * as path from 'path'

interface EmailVariables {
  customerName: string
  propertyName: string
  checkInDate: string
  checkOutDate: string
  totalPrice: string
  currency: string
  bookingUrl: string
  unsubscribeUrl: string
  [key: string]: string | boolean | null | undefined
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

    // Sanitize variables to prevent XSS
    const sanitizedVariables = sanitizeVariables(variables)

    // Render MJML with Handlebars
    const mjmlContent = template(sanitizedVariables)

    // Convert MJML to HTML
    const { html, errors } = mjml2html(mjmlContent)

    if (errors.length > 0) {
      console.warn('MJML rendering warnings:', errors)
    }

    return html
  } catch (error) {
    console.error('Error rendering email template:', error)
    throw new Error('Failed to render email template')
  }
}

/**
 * Sanitize template variables to prevent HTML/XSS injection
 * Handlebars {{variable}} automatically HTML-escapes, but we double-check
 */
function sanitizeVariables(variables: EmailVariables): EmailVariables {
  const sanitized: EmailVariables = {}

  for (const [key, value] of Object.entries(variables)) {
    if (typeof value === 'string') {
      // HTML escape the value
      sanitized[key] = htmlEscape(value)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}

/**
 * HTML escape a string to prevent injection
 */
function htmlEscape(str: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return str.replace(/[&<>"']/g, (char) => map[char])
}

/**
 * Generate unsubscribe token (JWT-like signed token)
 * For now, returns a placeholder - implement proper JWT signing in production
 */
export function generateUnsubscribeToken(organizationId: string, customerEmail: string): string {
  // TODO: Implement proper JWT signing
  // For now, return base64 encoded combination
  const payload = `${organizationId}:${customerEmail}`
  return Buffer.from(payload).toString('base64')
}

/**
 * Test if email rendering works
 */
export async function testEmailRendering(): Promise<void> {
  const testVariables: EmailVariables = {
    customerName: 'John Doe',
    propertyName: 'Sunny Beach Resort',
    checkInDate: 'May 25, 2026',
    checkOutDate: 'May 30, 2026',
    totalPrice: '1250.00',
    currency: 'USD',
    bookingUrl: 'https://example.com/bookings/123',
    unsubscribeUrl: 'https://lodgra.io/unsubscribe?token=abc123',
    subject: 'Booking Confirmation',
    organizationName: 'Sunny Beach Resort',
    logoUrl: null,
    replyToEmail: 'support@example.com',
    footerText: 'Thank you for booking with us!',
    year: new Date().getFullYear().toString(),
    primaryColor: '#1E40AF',
  }

  const html = await renderEmailTemplate(testVariables)
  console.log('✅ Email rendering test passed')
  console.log('HTML length:', html.length)
}
