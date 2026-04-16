import { test, expect } from '@playwright/test'
import { BookingPage } from './pages/BookingPage'

/**
 * E2E Tests for Public Booking Flow (Story 9.x)
 *
 * Tests the public property page, availability calendar,
 * and booking initiation. Stripe checkout is NOT tested
 * (requires real payment — mock in CI).
 */

const TEST_PROPERTY_SLUG = process.env.TEST_PROPERTY_SLUG || ''

test.describe('Public Booking Flow', () => {
  test.beforeEach(() => {
    test.skip(!TEST_PROPERTY_SLUG, 'TEST_PROPERTY_SLUG not configured')
  })

  test('property page loads with title and details', async ({ page }) => {
    const booking = new BookingPage(page)
    await booking.goto(TEST_PROPERTY_SLUG)
    await booking.isLoaded()

    // Property title should be visible
    await expect(booking.propertyTitle).toBeVisible()
    const title = await booking.propertyTitle.textContent()
    expect(title?.trim().length).toBeGreaterThan(0)
  })

  test('availability calendar renders on property page', async ({ page }) => {
    const booking = new BookingPage(page)
    await booking.goto(TEST_PROPERTY_SLUG)
    await booking.isLoaded()

    // Calendar or date picker should be visible
    const hasCalendar = await booking.calendarSection.isVisible({ timeout: 10000 }).catch(() => false)
    const hasDatePicker = await page.locator('.rdp, [class*="DayPicker"]').isVisible({ timeout: 5000 }).catch(() => false)
    expect(hasCalendar || hasDatePicker).toBeTruthy()
  })

  test('property page shows pricing information', async ({ page }) => {
    const booking = new BookingPage(page)
    await booking.goto(TEST_PROPERTY_SLUG)
    await booking.isLoaded()

    // Should show some price indicator (€, R$, $)
    const bodyText = await page.locator('body').textContent()
    const hasPrice = bodyText?.match(/[€$R\$]\s*\d+/) || bodyText?.match(/\d+\s*[€$]/)
    expect(hasPrice).toBeTruthy()
  })

  test('property page is responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    const booking = new BookingPage(page)
    await booking.goto(TEST_PROPERTY_SLUG)
    await booking.isLoaded()

    // Page should render without horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10) // small tolerance
  })

  test('booking confirmed page handles missing session', async ({ page }) => {
    // Access booking-confirmed without a valid session — should handle gracefully
    await page.goto(`/p/${TEST_PROPERTY_SLUG}/booking-confirmed`)
    await page.waitForLoadState('domcontentloaded')

    // Should not crash — either redirect or show message
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toBeTruthy()
  })
})
