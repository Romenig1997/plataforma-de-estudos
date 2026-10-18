import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import TelaAdminCursos from './TelaAdminCursos'
import { instalarFetch, respostaJson } from './testes/ajuda'

/** Cursos e aulas: escolha do curso, numeros e estrutura de disciplinas e topicos. */
describe('TelaAdminCursos', () => {
  const edital = (id: number, titulo: string) => ({
    id, titulo, orgao: 'Polícia Federal', sigla: 'PF', ano: 2026, criadoEm: '2026-01-01T00:00:00Z',
    materialPdfUrl: null, possuiPdfOriginal: true, concursos: [], bannerVersao: null,
    disciplinas: [{ id: id * 10, nome: `Português ${id}`, pagina: 1, assuntos: [
      { id: id * 100, nome: 'Interpretação de texto', pagina: 1, subassuntos: [
        { id: id * 100 + 1, nome: 'Tipologia textual', pagina: 1, subassuntos: [] },
        { id: id * 100 + 2, nome: 'Coesão', pagina: 1, subassuntos: [] },
      ] },
      { id: id * 100 + 5, nome: 'Crase', pagina: 2, subassuntos: [] },
    ] }],
  })

  const RESUMO = {
    totalAlunos: 1, totalAdministradores: 1, contasSemConfirmacao: 0, cursosPublicados: 2,
    editaisAguardandoRevisao: 0, questoesPublicadas: 5, questoesEmRascunho: 2,
    cursos: [
      { editalId: 1, titulo: 'PF 2026', sigla: 'PF', inscritos: 12, questoesPublicadas: 5, questoesEmRascunho: 2 },
      { editalId: 2, titulo: 'TJ 2026', sigla: 'TJ', inscritos: 4, questoesPublicadas: 0, questoesEmRascunho: 0 },
    ],
  }

  function renderizar(endereco = '/admin/cursos') {
    instalarFetch(({ url }) => {
      if (url === '/api/editais') return respostaJson(200, [edital(1, 'PF 2026'), edital(2, 'TJ 2026')])
      if (url === '/api/admin/resumo') return respostaJson(200, RESUMO)
      throw new Error(`URL inesperada no teste: ${url}`)
    })
    render(<MemoryRouter initialEntries={[endereco]}><TelaAdminCursos token="token" onEncerrarSessao={vi.fn()} /></MemoryRouter>)
  }

  it('abre o primeiro curso com numeros e a estrutura', async () => {
    renderizar()

    const numeros = await screen.findByRole('group', { name: 'Números de PF 2026' })
    expect(within(numeros).getByText('12')).toBeInTheDocument()
    expect(within(numeros).getByText('3 tópicos')).toBeInTheDocument()
    expect(within(numeros).getByRole('link', { name: '2 em rascunho' })).toHaveAttribute('href', '/admin/questoes')
    expect(screen.getByText('Português 1')).toBeInTheDocument()
    expect(screen.getByText('Tipologia textual')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver como aluno' })).toHaveAttribute('href', '/curso/1')
  })

  it('troca de curso pelo seletor e respeita o curso do endereco', async () => {
    renderizar('/admin/cursos?curso=2')

    expect(await screen.findByRole('group', { name: 'Números de TJ 2026' })).toBeInTheDocument()
    expect(screen.getByText('Nenhum rascunho')).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('Curso'), '1')
    expect(await screen.findByRole('group', { name: 'Números de PF 2026' })).toBeInTheDocument()
  })
})
