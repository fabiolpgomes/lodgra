import { type Page, type Locator } from '@playwright/test'

export class DashboardPage {
  readonly page: Page
  readonly heading: Locator
  readonly navLinks: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.locator('h1, h2').first()
    this.navLinks = page.locator('nav a')
  }

  async goto() {
    await this.page.goto('/dashboard')
    await this.page.waitForLoadState('domcontentloaded')
  }

  async navigateTo(path: string) {
    await this.page.goto(path)
    await this.page.waitForLoadState('domcontentloaded')
  }

  async isLoaded() {
    await this.heading.waitFor({ timeout: 15000 })
  }
}
