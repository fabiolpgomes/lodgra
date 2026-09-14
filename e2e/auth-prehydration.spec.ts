import { test, expect } from '@playwright/test'

test.describe('Credential forms before hydration', () => {
  test.use({ javaScriptEnabled: false })

  for (const pathname of ['/login', '/pt-BR/login', '/pt-BR/register']) {
    test(`${pathname} disables submit and keeps native fallback credentials out of the URL`, async ({ page }) => {
      await page.goto(pathname, { waitUntil: 'domcontentloaded' })
      const form = page.locator('form')
      await expect(form).toHaveAttribute('method', 'post')
      await expect(form.locator('button[type="submit"]')).toBeDisabled()

      // Disposable values only. Intercept the forced native submission so it
      // cannot create an account or send a request to the authentication server.
      await form.locator('input[name="email"]').fill('hydration-check@example.invalid')
      await form.locator('input[name="password"]').fill('Fictitious-only-42!')
      await page.route('**/*', async route => {
        if (route.request().isNavigationRequest() && route.request().method() === 'POST') {
          await route.fulfill({ status: 200, contentType: 'text/html', body: '<p>Intercepted test submission</p>' })
        } else {
          await route.continue()
        }
      })
      const submitted = page.waitForRequest(request => request.isNavigationRequest() && request.method() === 'POST')
      await form.evaluate((element: HTMLFormElement) => element.submit())
      const request = await submitted
      expect(new URL(request.url()).search).toBe('')
      expect(new URL(request.url()).pathname).toBe(pathname)
      const body = new URLSearchParams(request.postData()!)
      expect(body.get('email')).toBe('hydration-check@example.invalid')
      expect(body.get('password')).toBe('Fictitious-only-42!')
    })
  }
})
