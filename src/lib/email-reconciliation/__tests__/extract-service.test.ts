import { EmailExtractionSchema } from '../extraction.schema'

describe('Email extraction schema', () => {
  it('validates required fields', () => {
    const validData = {
      guest_name: 'João Silva',
      check_in: '2026-08-20',
      check_out: '2026-08-25',
    }

    const result = EmailExtractionSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('rejects missing required fields', () => {
    const invalidData = {
      guest_name: 'João Silva',
      check_in: '2026-08-20',
      // missing check_out
    }

    const result = EmailExtractionSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('validates date format', () => {
    const validDates = {
      guest_name: 'Test',
      check_in: '2026-12-25',
      check_out: '2026-12-31',
    }

    const result = EmailExtractionSchema.safeParse(validDates)
    expect(result.success).toBe(true)
  })

  it('rejects invalid date format', () => {
    const invalidDates = {
      guest_name: 'Test',
      check_in: '25/12/2026',
      check_out: '31/12/2026',
    }

    const result = EmailExtractionSchema.safeParse(invalidDates)
    expect(result.success).toBe(false)
  })

  it('accepts optional fields', () => {
    const withOptional = {
      guest_name: 'Test',
      check_in: '2026-12-25',
      check_out: '2026-12-31',
      number_of_guests: 2,
      total_value: 1000,
      currency: 'EUR',
    }

    const result = EmailExtractionSchema.safeParse(withOptional)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.number_of_guests).toBe(2)
      expect(result.data.total_value).toBe(1000)
    }
  })
})
