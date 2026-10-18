import AxeBuilder from '@axe-core/playwright'
import { expect, test } from './fixtures'

test('página inicial é acessível, responsiva e encaminha para recursos protegidos', async ({ page }) => {
  for (const width of [320, 1280]) {
    await page.setViewportSize({ width, height: 800 })
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('UMA PREPARAÇÃO COMPLETA')
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    const auditoria = await new AxeBuilder({ page }).analyze()
    expect(auditoria.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')).toEqual([])
  }
  for (const nome of ['Criar meu plano', 'Organizar minha semana', 'Começar a praticar', 'Ver desempenho', 'Ver recomendações', 'Acessar meu perfil']) {
    await page.goto('/')
    await page.getByRole('link', { name: new RegExp(nome) }).click()
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: 'Entrar na plataforma' })).toBeVisible()
  }
  await page.getByRole('link', { name: 'Criar minha conta' }).click()
  await expect(page).toHaveURL(/\/cadastro$/)
})
