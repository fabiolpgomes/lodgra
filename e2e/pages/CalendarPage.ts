import { type Page, type Locator } from '@playwright/test'

export class CalendarPage {
  readonly page: Page
  readonly heading: Locator
  readonly calendar: Locator
  readonly prevButton: Locator
  readonly nextButton: Locator
  readonly events: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.locator('h1, h2').first()
    this.calendar = page.locator('.fc, [class*="fullcalendar"], [class*="FullCalendar"]')
    this.prevButton = page.locator('button.fc-prev-button, [aria-label="prev"]')
    this.nextButton = page.locator('button.fc-next-button, [aria-label="next"]')
    this.events = page.locator('.fc-event')
  }

  async goto() {
    await this.page.goto('/calendar')
    await this.page.waitForLoadState('domcontentloaded')
  }

  async isLoaded() {
    await this.heading.waitFor({ timeout: 15000 })
  }

  async navigateNext() {
    await this.nextButton.click()
  }

  async navigatePrev() {
    await this.prevButton.click()
  }
}
