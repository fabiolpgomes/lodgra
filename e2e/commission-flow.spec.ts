/**
 * E2E tests for Commission Dashboard user flow
 * Tests the reports page with commission data
 */

import { test, expect } from './fixtures/auth'

test.describe('Commission Dashboard E2E Flow', () => {
  test.beforeEach(async () => {
    const email = process.env.TEST_USER_EMAIL
    const password = process.env.TEST_USER_PASSWORD
    test.skip(!email || !password, 'TEST_USER_EMAIL/PASSWORD não configurado')

  })

  test('Reports page loads successfully', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/reports')
    // Page should load without crashing
    await expect(page.locator('body')).toBeVisible()
    // Should have some heading
    await expect(page.getByRole('heading', { name: 'Relatórios', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Commission Overview', exact: true })).toBeVisible()
  })

  test('Commission section renders metrics', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/reports')
    for (const metric of ['Current Month', 'Year to Date', 'All Time']) {
      await expect(page.locator('p').filter({ hasText: new RegExp(`^${metric}$`) })).toBeVisible()
    }
  })

  test('CSV export button exists and triggers download', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/reports')

    const exportButton = page.getByRole('button', { name: 'Download CSV', exact: true })
    await expect(exportButton).toBeVisible()
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      exportButton.click(),
    ])
    expect(download.suggestedFilename()).toMatch(/\.csv$/)
    expect(await download.failure()).toBeNull()
  })

  test('Dashboard is responsive on mobile', async ({ authenticatedPage: page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/dashboard/reports')
    // Page should still render without errors
    await expect(page.locator('body')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Relatórios', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Commission Overview', exact: true })).toBeVisible()
  })

  test('Error states are handled gracefully', async ({ authenticatedPage: page }) => {
    await page.route('**/api/commissions/dashboard', route => route.fulfill({
      status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'unavailable' }),
    }))
    await page.goto('/dashboard/reports')
    // The page should not crash
    await expect(page.locator('body')).toBeVisible()
    await expect(page.getByText('Failed to fetch commission dashboard data', { exact: true })).toBeVisible()
  })
})
