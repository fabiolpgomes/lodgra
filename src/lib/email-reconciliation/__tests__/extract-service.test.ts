import { extractEmailData } from '../extract-service'

describe('Email extraction service', () => {
  it('extracts required fields from Airbnb email', async () => {
    const airbnbEmail = `
      Subject: Reservation Confirmed

      Dear Host,

      You have a new reservation!

      Guest: João Silva
      Check-in: August 20, 2026
      Check-out: August 25, 2026
      Number of guests: 2
      Total: EUR 1,500
      Confirmation code: AIRBNB123456
      Property: Casa da Praia
    `

    const result = await extractEmailData(airbnbEmail)

    expect(result.success).toBe(true)
    expect(result.data?.guest_name).toBeTruthy()
    expect(result.data?.check_in).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(result.data?.check_out).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(result.confidence).toBeGreaterThan(0.8)
  })

  it('extracts fields from Booking.com email', async () => {
    const bookingEmail = `
      Booking Confirmation

      Guest Name: Maria Santos
      Arrival: 15/08/2026
      Departure: 20/08/2026
      Guests: 3
      Total amount: EUR 2,000
      Booking reference: BK987654
      Property: Apartamento Lisboa
    `

    const result = await extractEmailData(bookingEmail)

    expect(result.success).toBe(true)
    expect(result.confidence).toBeGreaterThan(0.7)
  })

  it('fails gracefully with invalid email', async () => {
    const invalidEmail = 'Just some random text'

    const result = await extractEmailData(invalidEmail)

    expect(result.success).toBe(false)
    expect(result.confidence).toBeLessThan(0.5)
  })

  it('validates date format', async () => {
    const emailWithDates = `
      Guest: Test User
      Arrival Date: 2026-12-25
      Departure Date: 2026-12-31
      Guests: 1
    `

    const result = await extractEmailData(emailWithDates)

    if (result.success && result.data) {
      expect(result.data.check_in).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(result.data.check_out).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })
})
