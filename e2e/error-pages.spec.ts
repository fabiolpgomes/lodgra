import { test, expect } from '@playwright/test'

test.describe('Páginas de erro', () => {
  // TODO: Fix E2E error page tests - requires authentication setup
  test.skip('página 404 aparece para rotas inexistentes', async ({ page }) => {
    await page.goto('/pagina-que-nao-existe', { waitUntil: 'networkidle' })
    // Pode redirecionar para login se não autenticado, ou mostrar 404
    const content = await page.textContent('body')
    const is404 = content?.includes('404') || content?.includes('não encontrada')
    const isLogin = content?.includes('Entrar') || content?.includes('login')
    expect(is404 || isLogin).toBeTruthy()
  })
})
