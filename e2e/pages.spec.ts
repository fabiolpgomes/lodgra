import { test, expect } from './fixtures/auth'
import { DashboardPage } from './pages/DashboardPage'

test.describe('Páginas protegidas (requer autenticação)', () => {
  test.beforeEach(async () => {
    const email = process.env.TEST_USER_EMAIL
    const password = process.env.TEST_USER_PASSWORD
    test.skip(!email || !password, 'TEST_USER_EMAIL/PASSWORD not configured')
  })

  test('dashboard carrega', async ({ authenticatedPage: page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.goto()
    await dashboard.isLoaded()
  })

  test('página de propriedades carrega', async ({ authenticatedPage: page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.navigateTo('/properties')
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15000 })
  })

  test('página de reservas carrega', async ({ authenticatedPage: page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.navigateTo('/reservations')
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15000 })
  })

  test('página de despesas carrega', async ({ authenticatedPage: page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.navigateTo('/expenses')
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15000 })
  })

  test('página de calendário carrega', async ({ authenticatedPage: page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.navigateTo('/calendar')
    await expect(page).toHaveURL(/\/(pt|en-US|pt-BR)?\/?(calendar)/)
  })

  test('página de relatórios carrega', async ({ authenticatedPage: page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.navigateTo('/reports')
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15000 })
  })

  test('página de sincronização carrega', async ({ authenticatedPage: page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.navigateTo('/sync')
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15000 })
  })
})
