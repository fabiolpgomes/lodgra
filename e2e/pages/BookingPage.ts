import { expect, type Page, type Locator } from '@playwright/test'

export class BookingPage {
  readonly page: Page
  readonly propertyTitle: Locator
  readonly calendarSection: Locator
  readonly priceDisplay: Locator
  readonly bookButton: Locator
  readonly bookingWidget: Locator
  readonly visibleDateInputs: Locator
  readonly reserveNowLink: Locator

  constructor(page: Page) {
    this.page = page
    this.propertyTitle = page.locator('h1').first()
    this.calendarSection = page.locator('[class*="calendar"], [class*="Calendar"], .rdp')
    this.priceDisplay = page.locator('[class*="price"], [data-testid="price"]')
    this.bookButton = page.locator('button:has-text("Reservar"), button:has-text("Book")')
    this.bookingWidget = page.locator('div:has-text("Seleccione as datas para ver o preço exacto"):visible').first()
    this.visibleDateInputs = this.bookingWidget.locator('input[type="date"]')
    this.reserveNowLink = page.getByRole('link', { name: 'Reservar agora' })
  }

  async goto(slug: string) {
    await this.page.goto(`/p/${slug}`)
    await this.page.waitForLoadState('domcontentloaded')
  }

  async isLoaded() {
    await this.propertyTitle.waitFor({ timeout: 15000 })
  }

  async setBookingDates(checkIn: string, checkOut: string) {
    await this.bookingWidget.waitFor({ state: 'visible', timeout: 15000 })
    await this.visibleDateInputs.nth(0).evaluate((input, value) => {
      const element = input as HTMLInputElement
      const nextValue = String(value)
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      setter?.call(element, nextValue)
      element.dispatchEvent(new Event('input', { bubbles: true }))
      element.dispatchEvent(new Event('change', { bubbles: true }))
    }, checkIn)
    await expect(this.visibleDateInputs.nth(1)).toBeEnabled({ timeout: 5000 })
    await this.visibleDateInputs.nth(1).evaluate((input, value) => {
      const element = input as HTMLInputElement
      const nextValue = String(value)
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      setter?.call(element, nextValue)
      element.dispatchEvent(new Event('input', { bubbles: true }))
      element.dispatchEvent(new Event('change', { bubbles: true }))
    }, checkOut)
  }
}
