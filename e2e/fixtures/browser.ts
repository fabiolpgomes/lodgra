import { test as base, expect } from '@playwright/test'

/** Auth and dashboard tests start with optional cookies already declined. */
export const test = base.extend({
  page: async ({ page }, runWithPage) => {
    await page.addInitScript(() => {
      localStorage.setItem('cookie_consent', 'declined')
      localStorage.setItem('cookie_consent_analytics', 'declined')
    })
    await runWithPage(page)
  },
})

export { expect }
