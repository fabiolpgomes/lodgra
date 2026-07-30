import { sendReservationConfirmationEmail } from '@/lib/email/sendgrid'

jest.mock('@sendgrid/mail', () => ({
  __esModule: true,
  default: {
    setApiKey: jest.fn(),
    send: jest.fn(),
  },
}))

describe('SendGrid Email Service', () => {
  let mockSgMail: any

  beforeEach(() => {
    jest.clearAllMocks()
    mockSgMail = require('@sendgrid/mail').default
  })

  const templateData = {
    guestName: 'João Silva',
    propertyName: 'Casa na Praia',
    propertyAddress: 'Rua das Flores, 123',
    checkInDate: '15/08/2026',
    checkOutDate: '20/08/2026',
    nights: 5,
    guestCount: 2,
    pricePerNight: '€100.00',
    finalPrice: '€500.00',
    cancellationPolicyName: 'Flexível',
    refundPercentage: 100,
    refundDeadlineDays: 7,
    supportEmail: 'support@lodgra.io',
    supportPhone: '+55 (11) 3000-0000',
  }

  describe('sendReservationConfirmationEmail', () => {
    it('should send email successfully', async () => {
      const env = process.env.SENDGRID_API_KEY
      process.env.SENDGRID_API_KEY = 'test-api-key'

      mockSgMail.send.mockResolvedValue([
        {
          headers: {
            'x-message-id': 'msg-123',
          },
        },
      ])

      const result = await sendReservationConfirmationEmail('guest@email.com', templateData)

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('msg-123')

      process.env.SENDGRID_API_KEY = env
    })

    it('should handle special characters in guest name', async () => {
      const env = process.env.SENDGRID_API_KEY
      process.env.SENDGRID_API_KEY = 'test-api-key'

      mockSgMail.send.mockResolvedValue([
        {
          headers: {
            'x-message-id': 'msg-456',
          },
        },
      ])

      const result = await sendReservationConfirmationEmail('guest@email.com', {
        ...templateData,
        guestName: 'José Pereira da Silva',
      })

      expect(result.success).toBe(true)

      process.env.SENDGRID_API_KEY = env
    })

    it('should include discount section when provided', async () => {
      const env = process.env.SENDGRID_API_KEY
      process.env.SENDGRID_API_KEY = 'test-api-key'

      mockSgMail.send.mockResolvedValue([
        {
          headers: {
            'x-message-id': 'msg-789',
          },
        },
      ])

      const result = await sendReservationConfirmationEmail('guest@email.com', {
        ...templateData,
        discount: {
          percentage: 20,
          amount: '€100.00',
        },
      })

      expect(result.success).toBe(true)
      const callArgs = mockSgMail.send.mock.calls[0][0]
      expect(callArgs.html).toContain('Desconto')

      process.env.SENDGRID_API_KEY = env
    })

    it('should handle SendGrid API errors gracefully', async () => {
      const env = process.env.SENDGRID_API_KEY
      process.env.SENDGRID_API_KEY = 'test-api-key'

      mockSgMail.send.mockRejectedValue(new Error('Authentication failed'))

      const result = await sendReservationConfirmationEmail('guest@email.com', templateData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Authentication failed')

      process.env.SENDGRID_API_KEY = env
    })

    it('should validate email address is required', async () => {
      const env = process.env.SENDGRID_API_KEY
      process.env.SENDGRID_API_KEY = 'test-api-key'

      const result = await sendReservationConfirmationEmail('', templateData)

      expect(result.success).toBe(false)

      process.env.SENDGRID_API_KEY = env
    })

    it('should include guest details in email content', async () => {
      const env = process.env.SENDGRID_API_KEY
      process.env.SENDGRID_API_KEY = 'test-api-key'

      mockSgMail.send.mockResolvedValue([
        {
          headers: {
            'x-message-id': 'msg-content',
          },
        },
      ])

      const result = await sendReservationConfirmationEmail('guest@email.com', templateData)

      expect(result.success).toBe(true)

      const callArgs = mockSgMail.send.mock.calls[0][0]

      expect(callArgs.html).toContain('João Silva')
      expect(callArgs.text).toContain('João Silva')
      expect(callArgs.html).toContain('Casa na Praia')
      expect(callArgs.text).toContain('€500.00')

      process.env.SENDGRID_API_KEY = env
    })
  })
})
