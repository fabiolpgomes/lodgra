import { expect, type Page, type Locator } from '@playwright/test'

export class LoginPage {
  readonly page: Page
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly submitButton: Locator
  readonly errorAlert: Locator
  readonly registerLink: Locator
  readonly heading: Locator
  readonly logo: Locator

  constructor(page: Page) {
    this.page = page
    this.emailInput = page.locator('input[name="email"]')
    this.passwordInput = page.locator('input[name="password"]')
    this.submitButton = page.locator('button[type="submit"]')
    this.errorAlert = page.locator('[role="alert"][data-slot="alert"]')
    this.registerLink = page.locator('a[href*="register"]')
    this.heading = page.locator('h2')
    this.logo = page.getByRole('img', { name: 'Lodgra Logo', exact: true })
  }

  async goto() {
    await this.page.goto('/login', { waitUntil: 'domcontentloaded' })
    await this.emailInput.waitFor({ timeout: 15000 })
  }

  async login(email: string, password: string) {
    // The real form enables submission only after its client handlers hydrate.
    await expect(this.submitButton).toBeEnabled()
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.submitButton.click()
  }

  async waitForDashboard() {
    await this.page.waitForURL(/\/(pt|en-US|pt-BR)?\/?(dashboard)?$/, {
      timeout: 20000,
      waitUntil: 'domcontentloaded',
    })
  }
}
