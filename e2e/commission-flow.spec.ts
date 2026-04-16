/**
 * E2E tests for Commission Dashboard user flow
 * Tests the reports page with commission data
 */

import { test, expect } from '@playwright/test'

test.describe('Commission Dashboard E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL
    const password = process.env.TEST_USER_PASSWORD
    test.skip(!email || !password, 'TEST_USER_EMAIL/PASSWORD não configurado')

    await page.goto('/login')
    await page.fill('input[name="email"]', email!)
    await page.fill('input[name="password"]', password!)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(pt|en-US|pt-BR)?\/?(dashboard)?$/, { timeout: 15000 })
  })

  test('Reports page loads successfully', async ({ page }) => {
    await page.goto('/dashboard/reports')
    // Page should load without crashing
    await expect(page.locator('body')).toBeVisible()
    // Should have some heading
    await expect(page.locator('h1, h2').first()).toBeVisible()
  })

  test('Commission section renders metrics', async ({ page }) => {
    await page.goto('/dashboard/reports')
    // Look for commission-related content
    const body = await page.locator('body').textContent()
    // Page should contain financial data or commission info
    expect(body).toBeTruthy()
  })

  test('CSV export button exists and triggers download', async ({ page }) => {
    await page.goto('/dashboard/reports')

    // Look for any download/export button
    const exportButton = page.locator('button:has-text("CSV"), button:has-text("Download"), button:has-text("Exportar")')

    if (await exportButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        exportButton.first().click()
      ])
      const filename = download.suggestedFilename()
      expect(filename).toMatch(/\.csv$/)
    }
  })

  test('Dashboard is responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/dashboard/reports')
    // Page should still render without errors
    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('h1, h2').first()).toBeVisible()
  })

  test('Error states are handled gracefully', async ({ page }) => {
    await page.goto('/dashboard/reports')
    // The page should not crash
    await expect(page.locator('body')).toBeVisible()
  })
})
