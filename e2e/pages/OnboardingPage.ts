import { type Page, type Locator } from '@playwright/test'

export class OnboardingPage {
  readonly page: Page
  readonly heading: Locator
  readonly stepIndicators: Locator
  readonly nextButton: Locator
  readonly orgNameInput: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.locator('h1, h2').first()
    this.stepIndicators = page.locator('[class*="step"], [class*="Step"]')
    this.nextButton = page.locator('button:has-text("Próximo"), button:has-text("Next"), button:has-text("Continuar")')
    this.orgNameInput = page.locator('input[name="orgName"], input[placeholder*="nome"], input[placeholder*="name"]')
  }

  async goto() {
    await this.page.goto('/onboarding')
    await this.page.waitForLoadState('domcontentloaded')
  }

  async isLoaded() {
    await this.heading.waitFor({ timeout: 15000 })
  }
}
