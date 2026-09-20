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

  // DEBUG - capture the real Supabase auth response so we can tell a rate
  // limit / real error apart from a slow redirect. Remove once the CI-only
  // login timeout is root-caused.
  const authResponsePromise = page.waitForResponse(
    (response) => response.url().includes('/auth/v1/token'),
    { timeout: 20000 },
  ).catch((e) => {
    console.log('[DEBUG login] no /auth/v1/token response observed:', e?.message)
    return null
  })

  await page.click('button[type="submit"]')

  const authResponse = await authResponsePromise
  if (authResponse) {
    const status = authResponse.status()
    const body = await authResponse.text().catch(() => '<unreadable body>')
    console.log(`[DEBUG login] /auth/v1/token responded ${status}: ${body.slice(0, 500)}`)
  }

  const pageErrorText = await page.locator('body').textContent().catch(() => null)
  if (pageErrorText && /invalid|error|rate limit|too many/i.test(pageErrorText)) {
    console.log('[DEBUG login] page text after submit contains error-like content (first 300 chars):', pageErrorText.slice(0, 300))
  }

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
