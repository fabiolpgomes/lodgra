import { type Page } from '@playwright/test'
import { test as base, expect } from './browser'
import { LoginPage } from '../pages/LoginPage'

/**
 * Auth fixtures for E2E tests.
 * Provides pre-authenticated pages for different user roles.
 */

export type AuthFixtures = {
  /** Login with admin credentials */
  authenticatedPage: Page
}

async function login(page: Page, email: string, password: string) {
  const loginPage = new LoginPage(page)
  await loginPage.goto()
  await loginPage.login(email, password)
  await loginPage.waitForDashboard()
}

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, runWithPage) => {
    const email = process.env.TEST_USER_EMAIL
    const password = process.env.TEST_USER_PASSWORD

    if (!email || !password) {
      throw new Error('TEST_USER_EMAIL and TEST_USER_PASSWORD must be set in .env.test')
    }

    await login(page, email, password)
    await runWithPage(page)
  },
})

export { expect }
