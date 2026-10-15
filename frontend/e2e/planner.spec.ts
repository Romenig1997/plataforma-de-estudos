import AxeBuilder from '@axe-core/playwright'
import { expect, test } from './fixtures'

const edital = { id: 1, titulo: 'Edital Corpo de Bombeiros Militar de Pernambuco', orgao: 'CBM PE', ano: 2026, criadoEm: '', concursos: [], disciplinas: [
  { id: 10, nome: 'Língua Portuguesa', pagina: 2, assuntos: [{ id: 20, nome: 'Compreensão', pagina: 2, subassuntos: [{ id: 21, nome: 'Interpretação de textos', pagina: 2, subassuntos: [] }] }] },
  { id: 11, nome: 'Matemática', pagina: 3, assuntos: [] },
] }

test('planner sem sessao cai no login', async ({ page }) => {
  await page.goto('/planner')
  await expect(page.getByRole('heading', { name: 'Entrar na plataforma' })).toBeVisible()
})

test('gera plano, restaura apos recarregar e passa no axe', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('plataforma:token', 'token-ficticio'))
  await page.route('**/api/editais', route => route.fulfill({ json: [edital] }))
  await page.route('**/api/perfil', route => route.fulfill({ json: { metaEstudoSemanal: 4 } }))
  let salvo: object | null = null
  await page.route('**/api/planner', async route => {
    if (route.request().method() === 'PUT') {
      const dados = route.request().postDataJSON() as { metaHorasSemanais: number; prioridades: { disciplinaId: number; prioridade: string }[] }
      expect(dados.prioridades.map(p => p.prioridade)).toEqual(['ALTA', 'BAIXA'])
      salvo = { id: 1, metaHorasSemanais: dados.metaHorasSemanais, atualizadoEm: '', edital, disciplinas: [
        { disciplinaId: 10, nome: 'Língua Portuguesa', prioridade: 'ALTA', minutosSemanais: 180 },
        { disciplinaId: 11, nome: 'Matemática', prioridade: 'BAIXA', minutosSemanais: 60 },
      ] }
    }
    await route.fulfill(salvo ? { json: salvo } : { status: 204 })
  })
  await page.goto('/planner')
  await page.getByRole('group', { name: 'Prioridade — Língua Portuguesa' }).getByRole('radio', { name: 'Alta' }).check()
  await page.getByRole('group', { name: 'Prioridade — Matemática' }).getByRole('radio', { name: 'Baixa' }).check()
  await page.getByRole('button', { name: 'Gerar e salvar plano' }).click()
  await expect(page.getByText(/Plano semanal gerado e salvo/)).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Plano semanal salvo' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Prioridade — Língua Portuguesa' }).getByRole('radio', { name: 'Alta' })).toBeChecked()
  await expect(page.getByRole('link', { name: 'Ver conteúdo no curso' })).toHaveAttribute('href', '/curso/1')
  for (const largura of [320, 1280]) {
    await page.setViewportSize({ width: largura, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    const axe = await new AxeBuilder({ page }).analyze()
    expect(axe.violations.filter(v => ['serious', 'critical'].includes(v.impact ?? ''))).toEqual([])
  }
})

test('planner sem meta mostra feedback de campo no navegador', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('plataforma:token', 'token-ficticio'))
  await page.route('**/api/editais', route => route.fulfill({ json: [edital] }))
  await page.route('**/api/perfil', route => route.fulfill({ json: { metaEstudoSemanal: null } }))
  await page.route('**/api/planner', route => route.fulfill({ status: 204 }))
  await page.goto('/planner')
  await page.getByRole('button', { name: 'Gerar e salvar plano' }).click()
  const campo = page.getByLabel('Meta semanal (horas)')
  await expect(campo).toHaveAttribute('aria-invalid', 'true')
  await expect(campo).toHaveCSS('border-color', 'rgb(220, 38, 38)')
})
