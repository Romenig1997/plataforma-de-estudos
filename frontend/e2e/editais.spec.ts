import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

/**
 * Importacao de editais (HU07, incremento A), validada no navegador.
 *
 * <p>Assim como a HU06, estes testes nao precisam do backend no ar: a rota
 * autenticada cai no login sem sessao (verificado aqui), e com uma sessao
 * simulada a tela monta o formulario e o aviso de erro de rede, que e um
 * estado real da interface passivel de auditoria de acessibilidade. O fluxo
 * completo com dados fica no Vitest (jsdom) e nos testes de integracao do
 * backend.
 */
test.describe('HU07 - importacao de editais', () => {
  test('a rota /admin/editais sem sessao cai no login', async ({ page }) => {
    await page.goto('/admin/editais')

    await expect(page.getByRole('heading', { name: 'Entrar na plataforma' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Importar editais' })).not.toBeVisible()
  })

  test('a tela de importacao passa na auditoria de acessibilidade (axe)', async ({ page }) => {
    // Sessao simulada: qualquer token satisfaz a rota protegida (o backend
    // autentica de verdade; aqui o que esta sob teste e a interface).
    await page.addInitScript(() => {
      sessionStorage.setItem('plataforma:token', 'token-ficticio-do-e2e')
    })

    // O teste continua deterministico quando um backend real estiver no ar.
    await page.route('**/api/admin/editais/importacoes', route => route.abort())

    await page.goto('/admin/editais')
    await expect(page.getByRole('heading', { name: 'Importar editais' })).toBeVisible()
    await expect(page.getByText('Importar edital')).toBeVisible()

    const resultado = await new AxeBuilder({ page }).analyze()

    const violacoesSerias = resultado.violations.filter(
      (violacao) => violacao.impact === 'critical' || violacao.impact === 'serious',
    )
    expect(violacoesSerias, 'nenhuma violacao seria ou critica').toEqual([])
  })
})
