import { test as base, expect, type Page } from '@playwright/test'

/**
 * Auth fixtures for E2E tests.
 * Provides pre-authenticated pages for different user roles.
 */

export type AuthFixtures = {
  /** Login with admin credentials */
  authenticatedPage: Page
}

async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.waitForLoadState('domcontentloaded')

  // The /login redirects to /{locale}/login — wait for form
  await page.locator('input[name="email"]').waitFor({ timeout: 15000 })
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', password)
  await page.click('button[type="submit"]')

  // Wait for redirect to dashboard (may include locale prefix)
  await page.waitForURL(/\/(pt|en-US|pt-BR)?\/?(dashboard)?$/, { timeout: 20000 })
}

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    const email = process.env.TEST_USER_EMAIL
    const password = process.env.TEST_USER_PASSWORD

    if (!email || !password) {
      throw new Error('TEST_USER_EMAIL and TEST_USER_PASSWORD must be set in .env.test')
    }

    await login(page, email, password)
    await use(page)
  },
})

export { expect }
