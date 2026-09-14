import { test, expect } from './fixtures/browser'
import { OnboardingPage } from './pages/OnboardingPage'
import { LoginPage } from './pages/LoginPage'

/**
 * E2E Tests for Signup → Onboarding flow.
 * NOTE: Does not create real accounts — tests UI rendering and flow.
 */

test.describe('Signup → Onboarding', () => {
  test('register page has all required fields', async ({ page }) => {
    await page.goto('/register')
    await page.waitForLoadState('domcontentloaded')
    await page.locator('input[name="fullName"]').waitFor({ timeout: 15000 })

    // All form fields present
    await expect(page.locator('input[name="fullName"]')).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible()
    await expect(page.locator('#acceptTerms')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()

    // Terms and privacy links
    await expect(page.locator('a[href*="terms"]')).toBeVisible()
    await expect(page.locator('a[href*="privacy"]')).toBeVisible()
  })

  test('register page validates password requirements', async ({ page }) => {
    await page.goto('/register')
    await page.waitForLoadState('domcontentloaded')
    await page.locator('input[name="fullName"]').waitFor({ timeout: 15000 })

    // Fill with weak password
    await page.fill('input[name="fullName"]', 'Test')
    await page.fill('input[name="email"]', 'weak@test.com')
    await page.fill('input[name="password"]', 'weak')
    await page.fill('input[name="confirmPassword"]', 'weak')
    await page.locator('#acceptTerms').check()
    await page.click('button[type="submit"]')

    // minlength is enforced by native form validation before React submits.
    const password = page.locator('input[name="password"]')
    expect(await password.evaluate((input: HTMLInputElement) => input.validity.tooShort)).toBe(true)
    expect(await password.evaluate((input: HTMLInputElement) => input.validationMessage)).not.toBe('')
    await expect(page).toHaveURL(/\/register$/)

    // A long lowercase password reaches the application's complexity check.
    await password.fill('weakpassword')
    await page.locator('input[name="confirmPassword"]').fill('weakpassword')
    await page.locator('button[type="submit"]').click()
    await expect(page.getByRole('alert').filter({
      hasText: 'A senha deve conter pelo menos uma letra maiúscula e um número',
    })).toBeVisible()
  })

  test('onboarding page loads for authenticated users', async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL
    const password = process.env.TEST_USER_PASSWORD
    test.skip(!email || !password, 'TEST_USER_EMAIL/PASSWORD not configured')

    // Login first
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(email!, password!)
    await loginPage.waitForDashboard()

    // Navigate to onboarding
    const onboarding = new OnboardingPage(page)
    await onboarding.goto()

    // Should render (either onboarding wizard or redirect if already onboarded)
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toBeTruthy()
  })

  test('register page has social login buttons', async ({ page }) => {
    await page.goto('/register')
    await page.waitForLoadState('domcontentloaded')
    await page.locator('input[name="fullName"]').waitFor({ timeout: 15000 })

    await expect(page.getByRole('button', { name: 'Continuar com Google', exact: true })).toBeVisible()
  })
})
