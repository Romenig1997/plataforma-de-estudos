import AxeBuilder from '@axe-core/playwright'
import { entrarComo, expect, test } from './fixtures'

const edital = { id: 1, titulo: 'Edital Corpo de Bombeiros Militar de Pernambuco', orgao: 'CBM PE', ano: 2026, criadoEm: '', concursos: [], disciplinas: [
  { id: 10, nome: 'Língua Portuguesa', pagina: 2, assuntos: [{ id: 20, nome: 'Compreensão', pagina: 2, subassuntos: [{ id: 21, nome: 'Interpretação de textos', pagina: 2, subassuntos: [] }] }] },
  { id: 11, nome: 'Matemática', pagina: 3, assuntos: [] },
] }

test('planner sem sessao cai no login', async ({ page }) => {
  await page.goto('/planner')
  await expect(page.getByRole('heading', { name: 'Entrar na plataforma' })).toBeVisible()
})

const inscricao = { editalId: 1, titulo: edital.titulo, orgao: edital.orgao, ano: 2026, emFoco: true, metaHorasSemanais: 4, atualizadoEm: '', totalTopicos: 2, topicosConcluidos: 0, progresso: 0 }
const planoInicial = { id: 1, metaHorasSemanais: 4, atualizadoEm: '', edital, emFoco: true, disciplinas: [
  { disciplinaId: 10, nome: 'Língua Portuguesa', prioridade: 'NORMAL', minutosSemanais: 120 },
  { disciplinaId: 11, nome: 'Matemática', prioridade: 'NORMAL', minutosSemanais: 120 },
] }

test('ajusta o plano do curso, restaura apos recarregar e passa no axe', async ({ page }) => {
  await entrarComo(page, 'ALUNO')
  await page.route('**/api/cursos/inscricoes', route => route.fulfill({ json: [inscricao] }))
  let salvo: object = planoInicial
  await page.route('**/api/planner**', async route => {
    if (route.request().method() === 'PUT') {
      const dados = route.request().postDataJSON() as { metaHorasSemanais: number; prioridades: { disciplinaId: number; prioridade: string }[] }
      expect(dados.prioridades.map(p => p.prioridade)).toEqual(['ALTA', 'BAIXA'])
      salvo = { ...planoInicial, metaHorasSemanais: dados.metaHorasSemanais, disciplinas: [
        { disciplinaId: 10, nome: 'Língua Portuguesa', prioridade: 'ALTA', minutosSemanais: 180 },
        { disciplinaId: 11, nome: 'Matemática', prioridade: 'BAIXA', minutosSemanais: 60 },
      ] }
    }
    await route.fulfill({ json: salvo })
  })
  await page.goto('/planner')
  await expect(page.getByRole('navigation', { name: 'Cursos inscritos' })).toContainText('Em foco')
  await page.getByRole('group', { name: 'Prioridade — Língua Portuguesa' }).getByRole('radio', { name: 'Alta' }).check()
  await page.getByRole('group', { name: 'Prioridade — Matemática' }).getByRole('radio', { name: 'Baixa' }).check()
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByText(/Plano semanal gerado e salvo/)).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Plano semanal salvo' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Prioridade — Língua Portuguesa' }).getByRole('radio', { name: 'Alta' })).toBeChecked()
  await expect(page.getByRole('link', { name: 'Ver conteúdo no curso' })).toHaveAttribute('href', '/curso/1')
  for (const largura of [320, 1280]) {
    await page.setViewportSize({ width: largura, height: 900 })
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    const axe = await new AxeBuilder({ page }).analyze()
    expect(axe.violations.filter(v => ['serious', 'critical'].includes(v.impact ?? ''))).toEqual([])
  }
})

test('planner com meta invalida mostra feedback de campo no navegador', async ({ page }) => {
  await entrarComo(page, 'ALUNO')
  await page.route('**/api/cursos/inscricoes', route => route.fulfill({ json: [inscricao] }))
  await page.route('**/api/planner**', route => route.fulfill({ json: planoInicial }))
  await page.goto('/planner')
  const campo = page.getByLabel('Meta semanal (horas)')
  await campo.fill('0')
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(campo).toHaveAttribute('aria-invalid', 'true')
  await expect(campo).toHaveCSS('border-color', 'rgb(200, 40, 58)')
})

test('Meus cursos separa inscritos e vitrine e passa no axe no celular', async ({ page }) => {
  await entrarComo(page, 'ALUNO')
  const outro = { ...edital, id: 2, titulo: 'Edital Polícia Militar', orgao: 'PM' }
  await page.route('**/api/auth/me', route => route.fulfill({ json: { id: 1, nome: 'Ana Souza', email: 'ana@email.com', perfil: 'ALUNO' } }))
  await page.route('**/api/editais', route => route.fulfill({ json: [edital, outro] }))
  await page.route('**/api/cursos/inscricoes', route => route.fulfill({ json: [inscricao] }))
  await page.goto('/app')
  await expect(page.getByRole('region', { name: 'Explorar cursos' }).getByRole('button', { name: 'Inscrever-se' })).toBeVisible()
  for (const largura of [320, 1280]) {
    await page.setViewportSize({ width: largura, height: 900 })
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    const axe = await new AxeBuilder({ page }).analyze()
    expect(axe.violations.filter(v => ['serious', 'critical'].includes(v.impact ?? ''))).toEqual([])
  }
})
