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

  // DEBUG - throw with the real Supabase auth response instead of letting
  // the redirect time out silently, so CI surfaces WHY login didn't
  // complete (console.log from the test file wasn't showing up in the CI
  // log, so this uses a thrown Error instead, which we've confirmed does
  // get captured). Remove once the CI-only login timeout is root-caused.
  const authResponsePromise = page.waitForResponse(
    (response) => response.url().includes('/auth/v1/token'),
    { timeout: 15000 },
  )

  await page.click('button[type="submit"]')

  let authResponse
  try {
    authResponse = await authResponsePromise
  } catch {
    throw new Error('[DEBUG] No /auth/v1/token response observed within 15s after clicking submit - the app may call a different endpoint, or the request never fired.')
  }

  const status = authResponse.status()
  if (status < 200 || status >= 300) {
    const body = await authResponse.text().catch(() => '<unreadable body>')
    throw new Error(`[DEBUG] /auth/v1/token responded ${status}: ${body.slice(0, 500)}`)
  }

  // Auth itself succeeded - if this still times out, the problem is the
  // frontend redirect, not Supabase.
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
