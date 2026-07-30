import { sendReservationSMS } from '@/lib/sms/twilio'

jest.mock('twilio')

describe('Twilio SMS Service', () => {
  const templateData = {
    guestName: 'João Silva',
    guestPhone: '+5511987654321',
    propertyName: 'Casa na Praia',
    checkInDate: '15/08/2026',
    checkOutDate: '20/08/2026',
    finalPrice: '€500.00',
    reservationId: 'RES-001',
    supportPhone: '+55 (11) 3000-0000',
  }

  beforeEach(() => {
    process.env.TWILIO_ACCOUNT_SID = 'test-account-sid'
    process.env.TWILIO_AUTH_TOKEN = 'test-auth-token'
    process.env.TWILIO_PHONE_NUMBER = '+5511999999999'
  })

  afterEach(() => {
    delete process.env.TWILIO_ACCOUNT_SID
    delete process.env.TWILIO_AUTH_TOKEN
    delete process.env.TWILIO_PHONE_NUMBER
    jest.clearAllMocks()
  })

  it('should skip SMS when phone number is empty', async () => {
    const result = await sendReservationSMS('', templateData)

    expect(result.success).toBe(true)
    expect(result.messageId).toBe('skipped')
  })

  it('should reject invalid phone formats', async () => {
    const result = await sendReservationSMS('invalid-phone', templateData)

    expect(result.success).toBe(false)
  })

  it('should handle missing credentials gracefully', async () => {
    delete process.env.TWILIO_ACCOUNT_SID

    const result = await sendReservationSMS('+5511987654321', templateData)

    expect(result.success).toBe(false)
  })
})
