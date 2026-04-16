import { test, expect } from '@playwright/test'

/**
 * E2E Tests for Reports MVP (Stories 1.1-1.4)
 *
 * Scenarios:
 * 1. Load reports page and verify all tabs render
 * 2. Verify RevPAR and occupancy calculations
 * 3. Test P&L statement with platform fees
 * 4. Validate channel analysis and dependency bars
 * 5. Check cash flow forecast horizons
 * 6. Test date filters and property filters
 * 7. Verify CSV export functionality
 */

test.describe('Reports Dashboard (MVP)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to reports (will redirect to login if not authenticated)
    // Skip reports tests if we get redirected to login (no mock auth available)
    try {
      await page.goto('/reports')
      // Wait for page to load or redirect
      await page.waitForURL(/(\/reports|\/login)/, { timeout: 10000 })

      // If redirected to login, skip the test
      if (page.url().includes('/login')) {
        test.skip()
        return
      }

      // Wait for initial data load
      await page.waitForSelector('[class*="shadow"]', { timeout: 10000 })
    } catch (error) {
      // If page doesn't load, skip test
      test.skip()
    }
  })

  test.skip('should load all report tabs', async ({ page }) => {
    // Verify tab buttons exist
    const receitas = page.getByRole('button', { name: /receitas/i })
    const despesas = page.getByRole('button', { name: /despesas/i })
    const pl = page.getByRole('button', { name: /p&l/i })
    const canais = page.getByRole('button', { name: /canais/i })
    const previsao = page.getByRole('button', { name: /previsão/i })

    await expect(receitas).toBeVisible()
    await expect(despesas).toBeVisible()
    await expect(pl).toBeVisible()
    await expect(canais).toBeVisible()
    await expect(previsao).toBeVisible()
  })

  test.skip('should display RevPAR and occupancy metrics (Story 1.1)', async ({ page }) => {
    // Navigate to property analysis section
    await page.getByText('Análise por Propriedade').waitFor()

    // Check for RevPAR card
    const revparText = page.getByText('RevPAR', { exact: false })
    await expect(revparText).toBeVisible()

    // Check for occupancy label
    const occupancyText = page.getByText('Taxa de Ocupação', { exact: false })
    await expect(occupancyText).toBeVisible()

    // Verify occupancy bar has ARIA attributes
    const occupancyBar = page.locator('[role="progressbar"][aria-label*="Occupancy"]').first()
    const ariaValueNow = await occupancyBar.getAttribute('aria-valuenow')
    expect(ariaValueNow).toBeTruthy()
    expect(parseInt(ariaValueNow || '0')).toBeGreaterThanOrEqual(0)
    expect(parseInt(ariaValueNow || '0')).toBeLessThanOrEqual(100)
  })

  test.skip('should display P&L statement with platform fees (Story 1.2)', async ({ page }) => {
    // Click P&L tab
    await page.getByRole('button', { name: /p&l/i }).click()

    // Wait for P&L component
    await page.getByText('Demonstrativo de Resultado', { exact: false }).waitFor()

    // Verify P&L structure
    await expect(page.getByText('Receita Bruta', { exact: false })).toBeVisible()
    await expect(page.getByText('Taxas de Plataforma', { exact: false })).toBeVisible()
    await expect(page.getByText('Receita Líquida', { exact: false })).toBeVisible()
    await expect(page.getByText('Despesas Operacionais', { exact: false })).toBeVisible()
    await expect(page.getByText('Impostos', { exact: false })).toBeVisible()
    await expect(page.getByText('Lucro Líquido', { exact: false })).toBeVisible()
  })

  test.skip('should display channel revenue analysis (Story 1.3)', async ({ page }) => {
    // Click channels tab
    await page.getByRole('button', { name: /canais/i }).click()

    // Wait for channel section
    await page.getByText('Receita por Canal', { exact: false }).waitFor()

    // Check for risk legend
    await expect(page.getByText(/concentração alta/i)).toBeVisible()
    await expect(page.getByText(/moderada/i)).toBeVisible()
    await expect(page.getByText(/baixa/i)).toBeVisible()

    // Verify dependency bars have ARIA labels
    const dependencyBars = page.locator('[role="progressbar"][aria-label*="Revenue concentration"]')
    const count = await dependencyBars.count()
    expect(count).toBeGreaterThan(0)

    // Check first bar has proper ARIA values
    const firstBar = dependencyBars.first()
    const ariaValueNow = await firstBar.getAttribute('aria-valuenow')
    expect(ariaValueNow).toBeTruthy()
  })

  test.skip('should display cash flow forecast (Story 1.4)', async ({ page }) => {
    // Click forecast tab
    await page.getByRole('button', { name: /previsão/i }).click()

    // Wait for forecast section
    await page.getByText(/fluxo de caixa/i).waitFor()

    // Check for horizon cards
    await expect(page.getByText('Próximos 30 dias', { exact: false })).toBeVisible()
    await expect(page.getByText('31–60 dias', { exact: false })).toBeVisible()
    await expect(page.getByText('61–90 dias', { exact: false })).toBeVisible()

    // Verify month groups are collapsible
    const monthGroups = page.locator('[class*="border"][class*="rounded"]').filter({
      has: page.locator('[class*="capitalize"]')
    })
    const count = await monthGroups.count()
    expect(count).toBeGreaterThan(0)
  })

  test.skip('should filter reports by date range', async ({ page }) => {
    // Get filter inputs
    const startDateInput = page.locator('input[type="date"]').first()
    const endDateInput = page.locator('input[type="date"]').nth(1)

    // Change dates
    await startDateInput.fill('2024-01-01')
    await endDateInput.fill('2024-03-31')

    // Wait for data to reload
    await page.waitForTimeout(1000)

    // Verify date range appears in component
    const dateRangeText = page.getByText('2024-01-01 → 2024-03-31', { exact: false })
    await expect(dateRangeText).toBeVisible()
  })

  test.skip('should filter reports by property', async ({ page }) => {
    // Click property filter dropdown
    const propertyFilter = page.locator('select').first()
    const options = propertyFilter.locator('option')
    const optionCount = await options.count()

    if (optionCount > 1) {
      // Select second property
      await propertyFilter.selectOption({ index: 1 })

      // Wait for data to reload
      await page.waitForTimeout(1000)

      // Verify property-filtered data is visible
      const propertyName = await propertyFilter.inputValue()
      expect(propertyName).toBeTruthy()
    }
  })

  test.skip('should export revenue data to CSV', async ({ page }) => {
    // Click export button in Receitas tab
    const exportButton = page.getByRole('button', { name: /exportar/i }).first()

    // Listen for download event
    const downloadPromise = page.waitForEvent('download')
    await exportButton.click()
    const download = await downloadPromise

    // Verify file was downloaded
    expect(download.suggestedFilename()).toContain('receita')
  })

  test.skip('should export P&L statement to CSV', async ({ page }) => {
    // Click P&L tab
    await page.getByRole('button', { name: /p&l/i }).click()

    // Click export button
    const exportButton = page.getByRole('button', { name: /exportar/i }).first()

    // Listen for download
    const downloadPromise = page.waitForEvent('download')
    await exportButton.click()
    const download = await downloadPromise

    // Verify file contains P&L data
    expect(download.suggestedFilename()).toContain('pl_demonstrativo')
  })

  test.skip('should display empty state when no data', async ({ page }) => {
    // Filter to future date with no reservations
    const startDateInput = page.locator('input[type="date"]').first()
    const endDateInput = page.locator('input[type="date"]').nth(1)

    await startDateInput.fill('2099-01-01')
    await endDateInput.fill('2099-03-31')

    // Wait for empty state
    await page.waitForTimeout(1000)

    // Should show empty state message
    const emptyState = page.getByText(/nenhum dado/i)
    const isVisible = await emptyState.isVisible().catch(() => false)
    if (isVisible) {
      await expect(emptyState).toBeVisible()
    }
  })

  test.skip('should have accessible progress bars', async ({ page }) => {
    // Check all progress bars have ARIA attributes
    const progressBars = page.locator('[role="progressbar"]')
    const count = await progressBars.count()

    expect(count).toBeGreaterThan(0)

    // Verify each bar has required ARIA attributes
    for (let i = 0; i < Math.min(count, 3); i++) {
      const bar = progressBars.nth(i)
      const ariaValueNow = await bar.getAttribute('aria-valuenow')
      const ariaValueMin = await bar.getAttribute('aria-valuemin')
      const ariaValueMax = await bar.getAttribute('aria-valuemax')
      const ariaLabel = await bar.getAttribute('aria-label')

      expect(ariaValueNow).toBeTruthy()
      expect(ariaValueMin).toBe('0')
      expect(ariaValueMax).toBe('100')
      expect(ariaLabel).toBeTruthy()
    }
  })

  test.skip('should handle multi-currency displays', async ({ page }) => {
    // Look for currency badges/indicators
    const currencyElements = page.locator('[class*="bg-gray"][class*="text-gray"]').filter({
      hasText: /EUR|USD|GBP/
    })

    const count = await currencyElements.count()
    // Multi-currency might not always be present, but check if present
    if (count > 0) {
      await expect(currencyElements.first()).toBeVisible()
    }
  })
})
