import twilio from 'twilio'

export interface SMSTemplateData {
  guestName: string
  guestPhone: string
  propertyName: string
  checkInDate: string
  checkOutDate: string
  finalPrice: string
  reservationId: string
  supportPhone: string
}

export interface SMSSendResult {
  success: boolean
  messageId?: string
  error?: string
}

const initializeTwilio = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_PHONE_NUMBER

  if (!accountSid || !authToken || !fromNumber) {
    console.warn('[Twilio] Missing SMS configuration (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)')
    return null
  }

  return twilio(accountSid, authToken)
}

const formatPhoneNumber = (phone: string): string => {
  // Accept both +55 format and raw digits
  if (!phone) return ''

  const cleaned = phone.replace(/\D/g, '')

  // If it's Brazilian number, ensure it starts with 55
  if (cleaned.length === 11 && cleaned.startsWith('55')) {
    return `+${cleaned}`
  }

  // If it's 11 digits without country code, add +55
  if (cleaned.length === 11) {
    return `+55${cleaned}`
  }

  // If it starts with 55 but no +, add +
  if (cleaned.startsWith('55')) {
    return `+${cleaned}`
  }

  return ''
}

const renderSMSMessage = (data: SMSTemplateData): string => {
  const message = `Olá ${data.guestName}! Sua reserva foi confirmada. ${data.propertyName}, ${data.checkInDate} a ${data.checkOutDate}. Total: ${data.finalPrice}. Confirmação: ${data.reservationId}. Dúvidas? Ligue ${data.supportPhone}.`

  return message
}

export async function sendReservationSMS(
  guestPhone: string,
  templateData: SMSTemplateData
): Promise<SMSSendResult> {
  try {
    // Skip if phone not provided
    if (!guestPhone) {
      console.log('[Twilio] Phone number not provided - skipping SMS')
      return {
        success: true,
        messageId: 'skipped',
      }
    }

    const twilioClient = initializeTwilio()

    if (!twilioClient) {
      console.warn('[Twilio] SMS not sent - credentials not configured')
      return {
        success: false,
        error: 'Twilio credentials not configured',
      }
    }

    const formattedPhone = formatPhoneNumber(guestPhone)

    if (!formattedPhone) {
      console.warn(`[Twilio] Invalid phone number format: ${guestPhone}`)
      return {
        success: false,
        error: 'Invalid phone number format',
      }
    }

    const fromNumber = process.env.TWILIO_PHONE_NUMBER!
    const messageBody = renderSMSMessage(templateData)

    const message = await twilioClient.messages.create({
      body: messageBody,
      from: fromNumber,
      to: formattedPhone,
    })

    console.log(`[Twilio] SMS sent successfully to ${formattedPhone} (SID: ${message.sid})`)
    return {
      success: true,
      messageId: message.sid,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[Twilio] Failed to send SMS to ${guestPhone}:`, errorMessage)
    return {
      success: false,
      error: errorMessage,
    }
  }
}

export async function sendReservationSMSWithRetry(
  guestPhone: string,
  templateData: SMSTemplateData,
  maxAttempts: number = 3
): Promise<SMSSendResult> {
  // Skip if phone not provided
  if (!guestPhone) {
    return sendReservationSMS(guestPhone, templateData)
  }

  let lastError: string | undefined

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await sendReservationSMS(guestPhone, templateData)

    if (result.success) {
      return result
    }

    lastError = result.error

    if (attempt < maxAttempts) {
      const delayMs = 1000 * Math.pow(2, attempt - 1)
      console.log(
        `[Twilio] Retry attempt ${attempt}/${maxAttempts} failed, waiting ${delayMs}ms before retry...`
      )
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  console.error(`[Twilio] All ${maxAttempts} attempts failed for ${guestPhone}`)
  return {
    success: false,
    error: `Failed after ${maxAttempts} attempts: ${lastError}`,
  }
}
