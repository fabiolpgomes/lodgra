import { test, expect, type Page } from '@playwright/test'
import { BookingPage } from './pages/BookingPage'

/**
 * E2E Tests for Public Booking Flow (Story 9.x)
 *
 * Tests the public property page, availability calendar,
 * and booking initiation. Stripe checkout is NOT tested
 * (requires real payment — mock in CI).
 */

const TEST_PROPERTY_SLUG = process.env.TEST_PROPERTY_SLUG || ''
const TEST_BOOKING_CHECK_IN = process.env.TEST_BOOKING_CHECK_IN || '2026-10-05'
const TEST_BOOKING_CHECK_OUT = process.env.TEST_BOOKING_CHECK_OUT || '2026-10-08'

async function seedCookieConsent(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('cookie_consent', 'accepted')
    localStorage.setItem('cookie_consent_analytics', 'accepted')
  })
}

test.describe('Public Booking Flow', () => {
  test.beforeEach(() => {
    test.skip(!TEST_PROPERTY_SLUG, 'TEST_PROPERTY_SLUG not configured')
  })

  test('property page loads with title and details', async ({ page }) => {
    await seedCookieConsent(page)
    const booking = new BookingPage(page)
    await booking.goto(TEST_PROPERTY_SLUG)
    await booking.isLoaded()

    // Property title should be visible
    await expect(booking.propertyTitle).toBeVisible()
    const title = await booking.propertyTitle.textContent()
    expect(title?.trim().length).toBeGreaterThan(0)
  })

  test('availability calendar renders on property page', async ({ page }) => {
    await seedCookieConsent(page)
    const booking = new BookingPage(page)
    await booking.goto(TEST_PROPERTY_SLUG)
    await booking.isLoaded()

    // Calendar or date picker should be visible
    const hasCalendar = await booking.calendarSection.isVisible({ timeout: 10000 }).catch(() => false)
    const hasDatePicker = await page.locator('.rdp, [class*="DayPicker"]').isVisible({ timeout: 5000 }).catch(() => false)
    expect(hasCalendar || hasDatePicker).toBeTruthy()
  })

  test('property page shows pricing information', async ({ page }) => {
    await seedCookieConsent(page)
    const booking = new BookingPage(page)
    await booking.goto(TEST_PROPERTY_SLUG)
    await booking.isLoaded()

    // Should show some price indicator (€, R$, $)
    const bodyText = await page.locator('body').textContent()
    const hasPrice = bodyText?.match(/[€$R\$]\s*\d+/) || bodyText?.match(/\d+\s*[€$]/)
    expect(hasPrice).toBeTruthy()
  })

  test('property page is responsive on mobile', async ({ page }) => {
    await seedCookieConsent(page)
    await page.setViewportSize({ width: 375, height: 667 })

    const booking = new BookingPage(page)
    await booking.goto(TEST_PROPERTY_SLUG)
    await booking.isLoaded()

    // Page should render without horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10) // small tolerance
  })

  test('public booking total matches checkout total', async ({ page }) => {
    await seedCookieConsent(page)
    const booking = new BookingPage(page)
    await booking.goto(TEST_PROPERTY_SLUG)
    await booking.isLoaded()

    const pricingResponsePromise = page.waitForResponse((response) => {
      return response.request().method() === 'GET'
        && response.url().includes(`/api/public/properties/${TEST_PROPERTY_SLUG}/pricing`)
        && response.status() === 200
    })

    await booking.setBookingDates(TEST_BOOKING_CHECK_IN, TEST_BOOKING_CHECK_OUT)

    const pricingResponse = await pricingResponsePromise
    const pricing = await pricingResponse.json()
    const pricingTotal = Number(pricing?.total)

    expect(Number.isFinite(pricingTotal)).toBeTruthy()
    expect(pricingTotal).toBeGreaterThan(0)

    await expect(booking.bookingWidget).toContainText(`€${Math.round(pricingTotal)}`)
    await expect(booking.reserveNowLink).toBeVisible({ timeout: 15000 })

    const checkoutHref = await booking.reserveNowLink.getAttribute('href')
    expect(checkoutHref).toBe(`/p/${TEST_PROPERTY_SLUG}/checkout?checkin=${TEST_BOOKING_CHECK_IN}&checkout=${TEST_BOOKING_CHECK_OUT}&guests=1`)

    await page.goto(checkoutHref!)
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByText('Finalizar Reserva')).toBeVisible()

    const checkoutTotal = `€${pricingTotal.toFixed(2)}`
    await expect(page.locator('body')).toContainText(checkoutTotal)

    await page.getByRole('button', { name: 'Continuar' }).first().click()
    await page.getByPlaceholder('João Silva').fill('Ana Silva')
    await page.getByPlaceholder('joao@exemplo.com').fill('ana.silva@example.com')
    await page.getByPlaceholder('+351 912 345 678').fill('+351 912 345 678')
    await page.getByRole('button', { name: 'Continuar' }).first().click()
    await expect(page.getByRole('button', { name: new RegExp(`Pagar\\s+${checkoutTotal.replace('.', '\\.')}`) })).toBeVisible()
  })

  test('booking confirmed page handles missing session', async ({ page }) => {
    await seedCookieConsent(page)
    // Access booking-confirmed without a valid session — should handle gracefully
    await page.goto(`/p/${TEST_PROPERTY_SLUG}/booking-confirmed`)
    await page.waitForLoadState('domcontentloaded')

    // Should not crash — either redirect or show message
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toBeTruthy()
  })
})
