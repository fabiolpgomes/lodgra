import {
  extractDatesFromEmailBody
} from '@/lib/email-parser/propertyDetector'
import {
  findMatchingICalReservation
} from '@/lib/email-parser/reservationMatcher'
import {
  isCancellationEmail,
  extractCancellationDate
} from '@/lib/email-parser/cancellationDetector'
import { createAdminClient } from '@/lib/supabase/admin'

jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }))

describe('Email Parser Enrichment', () => {
  describe('propertyDetector', () => {
    it('should extract email domain correctly', () => {
      const domain = extractDatesFromEmailBody('')
      expect(domain).toBeDefined()
    })

    it('should detect Airbnb platform from domain', () => {
      const email = 'reservas@airbnb.com'
      expect(email.includes('airbnb')).toBe(true)
    })

    it('should detect Booking platform from domain', () => {
      const email = 'notify@booking.com'
      expect(email.includes('booking')).toBe(true)
    })

    it('should detect Flatio platform from domain', () => {
      const email = 'noreply@flatio.com'
      expect(email.includes('flatio')).toBe(true)
    })

    it('should handle unknown domains', () => {
      const email = 'unknown@example.com'
      expect(email.includes('airbnb')).toBe(false)
      expect(email.includes('booking')).toBe(false)
      expect(email.includes('flatio')).toBe(false)
    })

    it('should extract ISO dates from email body', () => {
      const body = 'Check-in: 2026-08-15, Check-out: 2026-08-18'
      const dates = extractDatesFromEmailBody(body)
      expect(dates).toBeDefined()
    })

    it('should extract slash format dates', () => {
      const body = 'Dates: 15/08/2026 - 18/08/2026'
      const dates = extractDatesFromEmailBody(body)
      expect(dates).toBeDefined()
    })
  })

  describe('reservationMatcher', () => {
    const query = {
      select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), not: jest.fn(),
    }
    beforeEach(() => {
      jest.clearAllMocks()
      ;(createAdminClient as jest.Mock).mockReturnValue({ from: jest.fn(() => query) })
      query.not.mockResolvedValue({ data: [{
        id: 'existing-reservation', check_in: '2026-08-15', check_out: '2026-08-18',
        guest_name: 'John Doe', first_name: 'John', last_name: 'Doe',
      }], error: null })
    })

    it('should return null if no dates provided', async () => {
      const result = await findMatchingICalReservation('prop1', null, null, 'John Doe')
      expect(result).toBeNull()
      expect(createAdminClient).not.toHaveBeenCalled()
    })

    it.each([
      ['exact dates and name', '2026-08-15', '2026-08-18', 'John Doe', 'existing-reservation'],
      ['score exactly 80 without email name', '2026-08-15', '2026-08-18', null, 'existing-reservation'],
      ['same dates but unrelated name', '2026-08-15', '2026-08-18', 'Alice Smith', null],
      ['same name but non-overlapping dates', '2026-09-15', '2026-09-18', 'John Doe', null],
    ])('applies the matching threshold for %s', async (_label, checkIn, checkOut, name, expected) => {
      expect(await findMatchingICalReservation('prop1', checkIn, checkOut, name)).toBe(expected)
      expect(query.eq).toHaveBeenCalledWith('property_id', 'prop1')
      expect(query.not).toHaveBeenCalledWith('status', 'eq', 'cancelled')
    })

    it('returns no match when the lookup succeeds with no reservations', async () => {
      query.not.mockResolvedValue({ data: [], error: null })
      expect(await findMatchingICalReservation('prop1', '2026-08-15', '2026-08-18', 'John Doe')).toBeNull()
    })

    it('propagates lookup failure instead of treating it as permission to create a duplicate', async () => {
      query.not.mockResolvedValue({ data: null, error: { message: 'Database unavailable' } })
      await expect(findMatchingICalReservation('prop1', '2026-08-15', '2026-08-18', 'John Doe'))
        .rejects.toThrow('Failed to look up existing reservations: Database unavailable')
    })
  })

  describe('cancellationDetector', () => {
    it('should detect "cancelled" keyword', () => {
      const subject = 'Your booking has been cancelled'
      const body = ''
      const result = isCancellationEmail(subject, body)
      expect(result).toBe(true)
    })

    it('should detect "cancel" keyword', () => {
      const subject = 'Booking cancellation'
      const body = ''
      const result = isCancellationEmail(subject, body)
      expect(result).toBe(true)
    })

    it('should detect multiple keywords', () => {
      const subject = 'Refund'
      const body = 'Your booking was cancelled and refunded'
      const result = isCancellationEmail(subject, body)
      expect(result).toBe(true)
    })

    it('should detect Portuguese cancellation keywords', () => {
      const subject = 'Cancelamento de reserva'
      const body = ''
      const result = isCancellationEmail(subject, body)
      expect(result).toBe(true)
    })

    it('should detect "voided" keyword', () => {
      const subject = 'Booking voided'
      const body = ''
      const result = isCancellationEmail(subject, body)
      expect(result).toBe(true)
    })

    it('should not flag normal confirmation email as cancellation', () => {
      const subject = 'Booking confirmed'
      const body = 'Your booking is confirmed for August 15-18'
      const result = isCancellationEmail(subject, body)
      expect(result).toBe(false)
    })

    it('should not flag price change email as cancellation', () => {
      const subject = 'Price updated'
      const body = 'The price for your booking has been updated'
      const result = isCancellationEmail(subject, body)
      expect(result).toBe(false)
    })

    it('should extract ISO date from email', () => {
      const body = 'Cancelled on 2026-08-15'
      const date = extractCancellationDate(body)
      expect(date).toBe('2026-08-15')
    })

    it('should extract slash format date', () => {
      const body = 'Cancellation date: 15/08/2026'
      const date = extractCancellationDate(body)
      expect(date).toBe('2026-08-15')
    })

    it('should return null if no date found', () => {
      const body = 'Your booking has been cancelled'
      const date = extractCancellationDate(body)
      expect(date).toBeNull()
    })
  })
})
