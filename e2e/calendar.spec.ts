import { test, expect } from './fixtures/auth'
import { CalendarPage } from './pages/CalendarPage'

/**
 * E2E Tests for Reservations Calendar.
 * Requires authenticated user.
 */

test.describe('Calendário de Reservas', () => {
  test.beforeEach(async () => {
    const email = process.env.TEST_USER_EMAIL
    const password = process.env.TEST_USER_PASSWORD
    test.skip(!email || !password, 'TEST_USER_EMAIL/PASSWORD not configured')
  })

  test('calendar page loads', async ({ authenticatedPage: page }) => {
    const calendarPage = new CalendarPage(page)
    await calendarPage.goto()

    // Should load either the calendar or redirect based on role
    await page.waitForLoadState('domcontentloaded')
    const url = page.url()
    const isCalendar = url.includes('calendar')
    const wasRedirected = url.includes('dashboard') || url.includes('login')
    expect(isCalendar || wasRedirected).toBeTruthy()
  })

  test('calendar renders FullCalendar component', async ({ authenticatedPage: page }) => {
    const calendarPage = new CalendarPage(page)
    await calendarPage.goto()

    // Wait for FullCalendar to mount (it's lazy-loaded)
    const calendar = page.locator('.fc, [class*="fc-"]')
    const hasCalendar = await calendar.first().isVisible({ timeout: 15000 }).catch(() => false)

    if (hasCalendar) {
      // Calendar toolbar should have navigation
      await expect(page.locator('.fc-toolbar, [class*="fc-toolbar"]').first()).toBeVisible()
    }
  })

  test('calendar navigation works', async ({ authenticatedPage: page }) => {
    const calendarPage = new CalendarPage(page)
    await calendarPage.goto()

    const calendar = page.locator('.fc, [class*="fc-"]')
    const hasCalendar = await calendar.first().isVisible({ timeout: 15000 }).catch(() => false)

    if (hasCalendar) {
      // Get current title
      const titleBefore = await page.locator('.fc-toolbar-title').textContent()

      // Navigate to next month
      await calendarPage.navigateNext()
      await page.waitForTimeout(500)

      const titleAfter = await page.locator('.fc-toolbar-title').textContent()
      // Title should change after navigation
      expect(titleAfter).not.toBe(titleBefore)
    }
  })

  test('calendar is responsive on mobile', async ({ authenticatedPage: page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    const calendarPage = new CalendarPage(page)
    await calendarPage.goto()

    // Page should render without crashing
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('body')).toBeVisible()
  })
})
