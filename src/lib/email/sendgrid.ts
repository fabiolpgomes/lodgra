import sgMail from '@sendgrid/mail'

export interface EmailTemplateData {
  guestName: string
  propertyName: string
  propertyAddress: string
  checkInDate: string
  checkOutDate: string
  nights: number
  guestCount: number
  pricePerNight: string
  finalPrice: string
  cancellationPolicyName: string
  refundPercentage: number
  refundDeadlineDays: number
  supportEmail: string
  supportPhone: string
  discount?: {
    percentage: number
    amount: string
  }
  notes?: string
}

export interface EmailSendResult {
  success: boolean
  messageId?: string
  error?: string
}

const initializeSendGrid = () => {
  const apiKey = process.env.SENDGRID_API_KEY
  if (!apiKey) {
    console.warn('[SendGrid] SENDGRID_API_KEY not configured')
    return null
  }
  sgMail.setApiKey(apiKey)
  return sgMail
}

const renderHTMLTemplate = (data: EmailTemplateData): string => {
  let html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu',
          'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
        line-height: 1.6;
        color: #333;
        background-color: #f5f5f5;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      .header {
        background: linear-gradient(135deg, #1e3a8a 0%, #0c6b2d 100%);
        color: white;
        padding: 40px 20px;
        text-align: center;
      }
      .header h1 {
        margin: 0;
        font-size: 28px;
        font-weight: 600;
      }
      .content {
        padding: 30px;
      }
      .greeting {
        font-size: 16px;
        margin-bottom: 20px;
      }
      .greeting strong {
        color: #1e3a8a;
      }
      .section {
        margin-bottom: 30px;
      }
      .section-title {
        font-size: 14px;
        font-weight: 600;
        color: #1e3a8a;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 15px;
        border-bottom: 2px solid #e5e7eb;
        padding-bottom: 10px;
      }
      .detail-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 0;
        border-bottom: 1px solid #f0f0f0;
      }
      .detail-row:last-child {
        border-bottom: none;
      }
      .detail-label {
        color: #666;
        font-size: 14px;
        font-weight: 500;
      }
      .detail-value {
        color: #1e3a8a;
        font-size: 14px;
        font-weight: 600;
      }
      .price-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 0;
        border-top: 2px solid #e5e7eb;
        border-bottom: 2px solid #e5e7eb;
        font-size: 18px;
        font-weight: 700;
        color: #0c6b2d;
      }
      .cancellation-policy {
        background-color: #f0fdf4;
        border-left: 4px solid #0c6b2d;
        padding: 15px;
        border-radius: 4px;
        font-size: 14px;
      }
      .cancellation-policy strong {
        color: #0c6b2d;
      }
      .footer {
        background-color: #f9fafb;
        padding: 20px;
        text-align: center;
        font-size: 12px;
        color: #666;
        border-top: 1px solid #e5e7eb;
      }
      .footer p {
        margin: 5px 0;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Confirmação de Reserva</h1>
        <p style="margin: 10px 0 0 0; font-size: 14px;">Lodgra - Seu espaço no Brasil</p>
      </div>

      <div class="content">
        <div class="greeting">
          Olá <strong>${data.guestName}</strong>,
        </div>

        <p>Sua reserva foi criada com sucesso! Confira os detalhes da sua hospedagem abaixo.</p>

        <div class="section">
          <div class="section-title">Detalhes da Propriedade</div>
          <div class="detail-row">
            <span class="detail-label">Propriedade</span>
            <span class="detail-value">${data.propertyName}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Endereço</span>
            <span class="detail-value">${data.propertyAddress}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Datas da Reserva</div>
          <div class="detail-row">
            <span class="detail-label">Check-in</span>
            <span class="detail-value">${data.checkInDate}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Check-out</span>
            <span class="detail-value">${data.checkOutDate}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Noites</span>
            <span class="detail-value">${data.nights}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Hóspedes</span>
            <span class="detail-value">${data.guestCount}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Resumo de Preços</div>
          <div class="detail-row">
            <span class="detail-label">Preço por noite</span>
            <span class="detail-value">${data.pricePerNight}</span>
          </div>
          ${data.discount ? `<div class="detail-row">
            <span class="detail-label">Desconto (${data.discount.percentage}%)</span>
            <span class="detail-value">-${data.discount.amount}</span>
          </div>` : ''}
          <div class="price-row">
            <span>Total</span>
            <span>${data.finalPrice}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Política de Cancelamento</div>
          <div class="cancellation-policy">
            <strong>${data.cancellationPolicyName}</strong>
            <p style="margin: 8px 0 0 0;">
              Você pode cancelar esta reserva e receber <strong>${data.refundPercentage}%</strong> do valor até
              <strong>${data.refundDeadlineDays} dias</strong> antes do check-in.
            </p>
          </div>
        </div>

        ${data.notes ? `<div class="section">
          <div class="section-title">Notas</div>
          <p>${data.notes}</p>
        </div>` : ''}
      </div>

      <div class="footer">
        <p><strong>Dúvidas ou problemas?</strong></p>
        <p>Entre em contato conosco: ${data.supportEmail}</p>
        <p>Telefone: ${data.supportPhone}</p>
        <p style="margin-top: 15px; font-size: 11px; color: #999;">
          Esta é uma confirmação automática. Por favor não responda a este email.
        </p>
      </div>
    </div>
  </body>
</html>
  `
  return html
}

const renderTextTemplate = (data: EmailTemplateData): string => {
  let text = `CONFIRMAÇÃO DE RESERVA - LODGRA

Olá ${data.guestName},

Sua reserva foi criada com sucesso! Confira os detalhes abaixo:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DETALHES DA PROPRIEDADE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Propriedade: ${data.propertyName}
Endereço: ${data.propertyAddress}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATAS DA RESERVA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Check-in: ${data.checkInDate}
Check-out: ${data.checkOutDate}
Noites: ${data.nights}
Hóspedes: ${data.guestCount}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESUMO DE PREÇOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Preço por noite: ${data.pricePerNight}
${data.discount ? `Desconto (${data.discount.percentage}%): -${data.discount.amount}` : ''}
──────────────────────────────────────────
TOTAL: ${data.finalPrice}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POLÍTICA DE CANCELAMENTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Política: ${data.cancellationPolicyName}

Você pode cancelar esta reserva e receber ${data.refundPercentage}% do valor até ${data.refundDeadlineDays} dias antes do check-in.

${data.notes ? `NOTAS:\n${data.notes}\n` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRECISA DE AJUDA?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Email: ${data.supportEmail}
Telefone: ${data.supportPhone}

Obrigado por escolher Lodgra!

---
Esta é uma confirmação automática. Por favor não responda a este email.
  `
  return text
}

export async function sendReservationConfirmationEmail(
  guestEmail: string,
  templateData: EmailTemplateData
): Promise<EmailSendResult> {
  try {
    const sgMailClient = initializeSendGrid()

    if (!sgMailClient) {
      console.warn('[SendGrid] Email not sent - API key not configured')
      return {
        success: false,
        error: 'SendGrid API key not configured',
      }
    }

    if (!guestEmail) {
      throw new Error('Guest email is required')
    }

    const htmlContent = renderHTMLTemplate(templateData)
    const textContent = renderTextTemplate(templateData)

    const msg = {
      to: guestEmail,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@lodgra.io',
      subject: 'Confirmação de Reserva - Lodgra',
      text: textContent,
      html: htmlContent,
    }

    const response = await sgMailClient.send(msg)

    if (response && response.length > 0) {
      const messageId = response[0].headers['x-message-id']
      console.log(`[SendGrid] Email sent successfully to ${guestEmail} (ID: ${messageId})`)
      return {
        success: true,
        messageId,
      }
    }

    throw new Error('No response from SendGrid')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[SendGrid] Failed to send email to ${guestEmail}:`, errorMessage)
    return {
      success: false,
      error: errorMessage,
    }
  }
}

export async function sendReservationConfirmationEmailWithRetry(
  guestEmail: string,
  templateData: EmailTemplateData,
  maxAttempts: number = 3
): Promise<EmailSendResult> {
  let lastError: string | undefined

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await sendReservationConfirmationEmail(guestEmail, templateData)

    if (result.success) {
      return result
    }

    lastError = result.error

    if (attempt < maxAttempts) {
      const delayMs = 1000 * Math.pow(2, attempt - 1)
      console.log(
        `[SendGrid] Retry attempt ${attempt}/${maxAttempts} failed, waiting ${delayMs}ms before retry...`
      )
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  console.error(`[SendGrid] All ${maxAttempts} attempts failed for ${guestEmail}`)
  return {
    success: false,
    error: `Failed after ${maxAttempts} attempts: ${lastError}`,
  }
}
