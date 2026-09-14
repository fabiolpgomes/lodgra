import { type Page, type Locator } from '@playwright/test'

export class PropertyPage {
  readonly page: Page
  readonly heading: Locator
  readonly createButton: Locator
  readonly propertyCards: Locator
  readonly propertyNames: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByRole('main').getByRole('heading', { name: 'Propriedades', exact: true })
    this.createButton = page.locator('a:has-text("Nova Propriedade"), a:has-text("Adicionar"), button:has-text("Nova")')
    this.propertyCards = page.locator('[class*="shadow"][class*="rounded"]').filter({ has: page.locator('h3') })
    this.propertyNames = page.locator('h3')
  }

  async goto() {
    await this.page.goto('/properties', { waitUntil: 'domcontentloaded' })
  }

  async isLoaded() {
    await this.heading.waitFor({ timeout: 15000 })
  }
}
