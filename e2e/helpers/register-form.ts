import { Page, expect } from '@playwright/test'

/**
 * Checks the register form's "accept terms" checkbox and clicks submit.
 *
 * Against a Next.js dev server, the very first interaction on a route can
 * race React hydration: Playwright's click toggles the checkbox's DOM
 * attribute before the component's onChange handler is attached, so the
 * app's `acceptedTerms` state never flips and the submit button stays
 * disabled forever. Re-checking once the button fails to enable in time
 * recovers from that race without weakening the assertion itself.
 */
export async function acceptTermsAndSubmit(page: Page) {
  const terms = page.locator('#acceptTerms')
  const submit = page.locator('button[type="submit"]')

  await terms.check()
  try {
    await expect(submit).toBeEnabled({ timeout: 3000 })
  } catch {
    await terms.uncheck()
    await terms.check()
    await expect(submit).toBeEnabled({ timeout: 10000 })
  }

  await submit.click()
}
