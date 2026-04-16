import { test, expect } from '@playwright/test'
import { LoginPage } from './pages/LoginPage'

test.describe('Autenticação', () => {
  test('página de login carrega corretamente', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()

    // Logo and heading
    await expect(loginPage.logo).toBeVisible()
    await expect(loginPage.heading).toBeVisible()

    // Form fields
    await expect(loginPage.emailInput).toBeVisible()
    await expect(loginPage.passwordInput).toBeVisible()
    await expect(loginPage.submitButton).toBeVisible()
  })

  test('mostra link para criar conta', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()

    await expect(loginPage.registerLink).toBeVisible()
  })

  test('página de registo carrega corretamente', async ({ page }) => {
    await page.goto('/register')
    await page.waitForLoadState('domcontentloaded')

    // Wait for redirect to locale-specific register page
    await page.locator('input[name="fullName"]').waitFor({ timeout: 15000 })

    await expect(page.locator('h1:has-text("Home Stay")')).toBeVisible()
    await expect(page.locator('h2:has-text("Criar Conta")')).toBeVisible()
    await expect(page.locator('input[name="fullName"]')).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible()
    await expect(page.locator('#acceptTerms')).toBeVisible()
  })

  test('mostra erro com credenciais inválidas', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()

    await loginPage.login('invalido@teste.com', 'SenhaErrada123')
    await expect(loginPage.errorAlert).toBeVisible({ timeout: 15000 })
  })

  test('registo mostra erro sem aceitar termos', async ({ page }) => {
    await page.goto('/register')
    await page.waitForLoadState('domcontentloaded')
    await page.locator('input[name="fullName"]').waitFor({ timeout: 15000 })

    await page.fill('input[name="fullName"]', 'Teste User')
    await page.fill('input[name="email"]', 'teste@teste.com')
    await page.fill('input[name="password"]', 'SenhaForte123')
    await page.fill('input[name="confirmPassword"]', 'SenhaForte123')

    // Submit button should be disabled without accepting terms
    await expect(page.locator('button[type="submit"]')).toBeDisabled()
  })

  test('registo mostra erro com senhas diferentes', async ({ page }) => {
    await page.goto('/register')
    await page.waitForLoadState('domcontentloaded')
    await page.locator('input[name="fullName"]').waitFor({ timeout: 15000 })

    await page.fill('input[name="fullName"]', 'Teste User')
    await page.fill('input[name="email"]', 'teste@teste.com')
    await page.fill('input[name="password"]', 'SenhaForte123')
    await page.fill('input[name="confirmPassword"]', 'SenhaDiferente456')

    // Accept terms to enable submit
    await page.locator('#acceptTerms').check()
    await page.click('button[type="submit"]')

    // Error about mismatched passwords
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 15000 })
  })

  test('redireciona para login quando não autenticado', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    // Should redirect to login (possibly with locale prefix)
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 })
  })
})
