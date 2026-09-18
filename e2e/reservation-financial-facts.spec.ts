import { test, expect } from '@playwright/test'

// Run only against a deliberately provisioned, disposable staging reservation.
// The fixture owner is responsible for cleanup after all browser/SQL checks.
const reservationId = process.env.TEST_FINANCIAL_RESERVATION_ID
test.describe.serial('Story 47.4 financial capture', () => {
  test.skip(!reservationId || process.env.TEST_FINANCIAL_MUTATION_ALLOWED !== '1'
    || !process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD, 'Requires a disposable financial fixture and test credentials')

  for (const width of [375, 390]) {
    test(`authenticated capture and conflict protection at ${width}px`, async ({ page, baseURL }, testInfo) => {
      test.setTimeout(90000)
      expect(new URL(baseURL!).hostname).toMatch(/^(localhost|127\.0\.0\.1)$/)
      expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://wrqjpyyopwgyqluqkcga.supabase.co')
      await page.setViewportSize({ width, height: width === 375 ? 812 : 844 })
      await page.goto('/pt-BR/login')
      const rejectCookies = page.getByRole('button', { name: 'Rejeitar Opcionais' })
      await rejectCookies.waitFor({ state: 'visible', timeout: 5000 }).catch(() => undefined)
      if (await rejectCookies.isVisible()) await rejectCookies.click()
      await page.locator('input[name="email"]').fill(process.env.TEST_USER_EMAIL!)
      await page.locator('input[name="password"]').fill(process.env.TEST_USER_PASSWORD!)
      await page.locator('button[type="submit"]').click()
      await page.waitForURL(url => !url.pathname.includes('/login'))

      const apiPath = `/api/reservations/${reservationId}/financial-facts`
      const factsResponse = page.waitForResponse(response => response.url().endsWith(apiPath))
      await page.goto(`/pt-BR/reservations/${reservationId}/edit`)
      const response = await factsResponse
      const before = await response.json()
      expect(response.status(), JSON.stringify(before)).toBe(200)
      expect(before.reservation.declaredOwnerBaseAllowed).toBe(true)
      expect(before.reservation.currency).toBe('EUR')
      const expectedVersion = before.currentSnapshot?.version ?? null
      const section = page.locator('section[aria-labelledby="financial-facts-title"]')
      await expect(section).toBeVisible()
      await page.locator('#financial-fact-mode').click()
      await page.getByRole('option', { name: 'Modo simplificado — valor base para repasse', exact: true }).click()
      await page.locator('#platform-net').fill('500')
      await page.locator('#manager-cleaning').fill('90')
      await expect(page.locator('#declared-base')).toHaveValue('410.00')
      await section.getByRole('button', { name: 'Guardar informação financeira' }).click()
      await expect(section.getByText('Confirme explicitamente o valor base para repasse antes de salvar.')).toBeVisible()
      await section.getByRole('checkbox').check()
      const savedResponse = page.waitForResponse(r => r.url().endsWith(apiPath) && r.request().method() === 'PUT')
      await section.getByRole('button', { name: 'Guardar informação financeira' }).click()
      const saved = await savedResponse
      const after = await saved.json()
      expect(saved.status(), JSON.stringify(after)).toBe(200)
      expect(after.currentSnapshot.version).toBe((expectedVersion ?? 0) + 1)
      expect(Number(after.currentSnapshot.declaredOwnerBaseAmount)).toBe(410)
      expect(after.reservation.compatibility).toBe('legacy_synced')
      expect(after.currentSnapshot.capturedBy?.id).toBeTruthy()
      await expect(section.getByText('Informação financeira guardada com versão e autoria.')).toBeVisible()

      const stale = await page.request.put(apiPath, { data: {
        expectedCurrentVersion: expectedVersion, factMode: 'declared_owner_base', currency: 'EUR', declaredOwnerBaseAmount: '999.00',
      } })
      expect(stale.status()).toBe(409)
      const overwrite = await page.request.put(`/api/reservations/${reservationId}`, { data: {
        guest_name: 'QA financeiro 47.4', total_price: 999,
      } })
      expect(overwrite.status()).toBe(409)
      expect((await overwrite.json()).code).toBe('FINANCIAL_TOTAL_MANAGED_BY_SNAPSHOT')

      await page.reload()
      await expect(page.locator('#declared-base')).toHaveValue(/410(?:\.0+)?/)
      await expect(section.getByRole('checkbox')).not.toBeChecked()
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
      await page.locator('#declared-base').scrollIntoViewIfNeeded()
      await page.screenshot({ path: testInfo.outputPath(`simplified-${width}.png`) })
      await page.locator('#financial-fact-mode').focus()
      await page.keyboard.press('Space')
      await page.keyboard.press('Escape')
      await expect(page.locator('#financial-fact-mode')).toBeFocused()
      await page.locator('#financial-fact-mode').click()
      await page.getByRole('option', { name: 'Componentes reconciliados', exact: true }).click()
      await expect(page.getByLabel('Valor bruto da hospedagem')).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
    })
  }
})
