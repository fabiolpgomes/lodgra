import { type Page, type Locator } from '@playwright/test'

export class BookingPage {
  readonly page: Page
  readonly propertyTitle: Locator
  readonly calendarSection: Locator
  readonly priceDisplay: Locator
  readonly bookButton: Locator

  constructor(page: Page) {
    this.page = page
    this.propertyTitle = page.locator('h1').first()
    this.calendarSection = page.locator('[class*="calendar"], [class*="Calendar"], .rdp')
    this.priceDisplay = page.locator('[class*="price"], [data-testid="price"]')
    this.bookButton = page.locator('button:has-text("Reservar"), button:has-text("Book")')
  }

  async goto(slug: string) {
    await this.page.goto(`/p/${slug}`)
    await this.page.waitForLoadState('domcontentloaded')
  }

  async isLoaded() {
    await this.propertyTitle.waitFor({ timeout: 15000 })
  }
}
