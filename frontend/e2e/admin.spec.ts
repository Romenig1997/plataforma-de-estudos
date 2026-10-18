import AxeBuilder from '@axe-core/playwright'
import { entrarComo, expect, test } from './fixtures'

/**
 * Painel de gestao (rotas /admin): navegacao propria, responsividade e
 * acessibilidade nos temas claro e escuro, sem backend no ar.
 */
const EU = { id: 1, nome: 'Ana Souza', email: 'ana@email.com', perfil: 'ADMIN', emailVerificado: true }
const RESUMO = {
  totalAlunos: 248, totalAdministradores: 2, novosAlunos30Dias: 37, contasSemConfirmacao: 9, cursosPublicados: 1,
  editaisAguardandoRevisao: 2, questoesPublicadas: 1180, questoesEmRascunho: 54,
  cursos: [{ editalId: 3, titulo: 'Polícia Federal 2026 — Agente', sigla: 'PF', inscritos: 112, questoesPublicadas: 900, questoesEmRascunho: 54 }],
  cadastrosRecentes: [{ id: 2, nome: 'Bruno Lima', perfil: 'ALUNO', criadoEm: '2026-10-15T12:00:00-03:00' }],
}

test.describe('Painel de gestão', () => {
  for (const tema of ['claro', 'escuro']) {
    test(`visão geral e alunos sem rolagem lateral e sem violações graves (${tema})`, async ({ page }) => {
      await entrarComo(page, 'ADMIN')
      await page.addInitScript(valor => localStorage.setItem('estuda:tema', valor), tema)
      await page.route('**/api/admin/resumo', r => r.fulfill({ json: RESUMO }))
      await page.route('**/api/admin/usuarios', r => r.fulfill({ json: [EU, { id: 2, nome: 'Bruno Lima', email: 'bruno.lima.com.um.email.longo@exemplo.com', perfil: 'ALUNO', emailVerificado: false }] }))
      await page.route('**/api/auth/me', r => r.fulfill({ json: EU }))
      await page.route('**/api/perfil/foto', r => r.fulfill({ status: 204 }))
      await page.route('**/api/editais', r => r.fulfill({ json: [{
        id: 3, titulo: 'Polícia Federal 2026 — Agente', orgao: 'Polícia Federal', sigla: 'PF', ano: 2026, criadoEm: '2026-01-01T00:00:00Z',
        materialPdfUrl: null, possuiPdfOriginal: true, concursos: [], bannerVersao: null,
        disciplinas: [{ id: 10, nome: 'Língua Portuguesa', pagina: 1, assuntos: [{ id: 20, nome: 'Interpretação de textos', pagina: 1, subassuntos: [] }] }],
      }] }))

      for (const [rota, titulo] of [['/admin', 'Visão geral'], ['/admin/alunos', 'Gestão de alunos'], ['/admin/cursos', 'Cursos e aulas']]) {
        await page.goto(rota)
        await expect(page.getByRole('heading', { name: titulo, level: 1 })).toBeVisible()
        await expect(page.getByRole('complementary', { name: 'Navegação administrativa' })).toBeVisible()
        // No editor de estrutura, audita a disciplina aberta com os botoes de cada topico.
        if (rota === '/admin/cursos') {
          await page.getByText('Língua Portuguesa', { exact: true }).click()
          await expect(page.getByRole('button', { name: 'Renomear Interpretação de textos' })).toBeVisible()
        }
        for (const width of [320, 1280]) {
          await page.setViewportSize({ width, height: 900 })
          // O layout do novo tamanho assenta logo depois do resize: espera o estado final.
          await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
          const auditoria = await new AxeBuilder({ page }).analyze()
          expect(auditoria.violations.filter(v => ['serious', 'critical'].includes(v.impact ?? ''))).toEqual([])
        }
      }
    })
  }

  test('a conta de aluno nao ve o painel', async ({ page }) => {
    await entrarComo(page, 'ALUNO')
    await page.goto('/admin/alunos')
    await expect(page.getByRole('heading', { name: 'Acesso negado' })).toBeVisible()
    await expect(page.getByRole('complementary', { name: 'Navegação administrativa' })).toHaveCount(0)
  })
})
