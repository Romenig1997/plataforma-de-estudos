import { afterEach, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import TelaCurso from './TelaCurso'
import { instalarFetch, respostaJson, type ChamadaFetch } from './testes/ajuda'
import type { Dashboard } from './dashboard'

const edital = {
  id: 5, titulo: 'Soldado CBM', orgao: 'CBM-PE', ano: 2026, criadoEm: '', materialPdfUrl: null, possuiPdfOriginal: false, concursos: [],
  disciplinas: [
    { id: 100, nome: 'Português', pagina: 1, assuntos: [
      { id: 10, nome: 'Interpretação', pagina: 1, subassuntos: [] },
      { id: 11, nome: 'Gramática', pagina: 2, subassuntos: [{ id: 12, nome: 'Crase', pagina: 2, subassuntos: [] }, { id: 13, nome: 'Regência', pagina: 3, subassuntos: [] }] },
    ] },
    { id: 200, nome: 'Legislação', pagina: 4, assuntos: [] },
  ],
}

const painel = (concluidos: number[] = []): Dashboard => ({
  editalId: 5, editalTitulo: 'Soldado CBM', totalTopicos: 3, topicosConcluidos: concluidos.length, progresso: 0, cronogramaDesatualizado: false, proximasAtividades: [],
  disciplinas: [{ id: 100, nome: 'Português', questoes: 0, acertos: 0, desempenho: null, topicos: [10, 12, 13].map(id => ({ id, nome: '', pagina: 1, concluido: concluidos.includes(id), questoes: 0, acertos: 0 })) }],
})

function backend(dashboard: Dashboard | null, aoSalvar?: (chamada: ChamadaFetch) => Response, jaInscrito = true) {
  let inscrito = jaInscrito
  return instalarFetch((chamada) => {
    if (chamada.url === '/api/editais') return respostaJson(200, [edital])
    if (chamada.url === '/api/cursos/5/inscricao') { inscrito = true; return respostaJson(200, {}) }
    if (chamada.url.startsWith('/api/dashboard/registros/')) return aoSalvar ? aoSalvar(chamada) : respostaJson(204)
    if (chamada.url.startsWith('/api/dashboard')) return dashboard && inscrito ? respostaJson(200, dashboard) : respostaJson(204)
    throw new Error(`URL inesperada: ${chamada.url}`)
  })
}

function renderizar(id = 5) {
  return render(<MemoryRouter initialEntries={[`/curso/${id}`]}><Routes>
    <Route path="/curso/:editalId" element={<TelaCurso token="token" onEncerrarSessao={vi.fn()} />} />
    <Route path="/planner" element={<h1>Planner de teste</h1>} />
  </Routes></MemoryRouter>)
}

afterEach(() => vi.unstubAllGlobals())

it('lista os topicos finais agrupados e mostra o progresso salvo no servidor', async () => {
  backend(painel([10]))
  renderizar()
  expect(await screen.findByRole('heading', { name: 'Soldado CBM' })).toBeInTheDocument()
  expect(screen.getByText('Gramática')).toBeInTheDocument()
  expect(screen.getByLabelText('Concluir aula 1 - Interpretação')).toBeChecked()
  expect(screen.getByLabelText('Concluir aula 2 - Crase')).not.toBeChecked()
  expect(screen.queryByLabelText(/Concluir aula \d+ - Gramática/)).not.toBeInTheDocument()
  expect(screen.getByRole('progressbar', { name: 'Progresso no curso: 33%' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Continuar de onde parei' })).toBeInTheDocument()
})

it('salva a conclusao da aula no servidor e atualiza o progresso', async () => {
  const fetch = backend(painel([10]))
  renderizar()
  await userEvent.click(await screen.findByLabelText('Concluir aula 2 - Crase'))
  expect(screen.getByLabelText('Concluir aula 2 - Crase')).toBeChecked()
  expect(screen.getByRole('progressbar', { name: 'Progresso no curso: 67%' })).toBeInTheDocument()
  const chamada = fetch.mock.calls.find(c => String(c[0]) === '/api/dashboard/registros/12')
  expect(chamada?.[1]?.method).toBe('PUT')
  expect(JSON.parse(String(chamada?.[1]?.body))).toEqual({ concluido: true })
})

it('desfaz a marcacao quando o servidor recusa', async () => {
  backend(painel(), () => respostaJson(400, { erros: [{ campo: 'conteudoId', mensagem: 'Selecione um tópico do seu edital atual.' }] }))
  renderizar()
  await userEvent.click(await screen.findByLabelText('Concluir aula 1 - Interpretação'))
  expect(await screen.findByText('Selecione um tópico do seu edital atual.')).toBeInTheDocument()
  expect(screen.getByLabelText('Concluir aula 1 - Interpretação')).not.toBeChecked()
})

it('sem inscricao permite navegar e se inscrever pelo proprio curso', async () => {
  const fetch = backend(painel(), undefined, false)
  renderizar()
  expect(await screen.findByText(/Adicione este curso ao seu planner/)).toBeInTheDocument()
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Adicionar ao planner' }))
  expect(await screen.findByRole('heading', { name: 'Planner de teste' })).toBeInTheDocument()
  expect(fetch.mock.calls.find(c => String(c[0]) === '/api/cursos/5/inscricao')?.[1]?.method).toBe('POST')
  expect(fetch.mock.calls.some(c => String(c[0]).includes('editalId=5'))).toBe(true)
})

it('nao exibe recursos inexistentes nem aula ficticia', async () => {
  backend(painel())
  renderizar()
  await screen.findByRole('heading', { name: 'Soldado CBM' })
  for (const nome of ['Tela de aula', 'Áudio', 'Anotações', 'Fórum de dúvidas']) {
    expect(screen.queryByRole('button', { name: nome })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: nome })).not.toBeInTheDocument()
  }
  expect(screen.queryByText(/Introdução à disciplina/)).not.toBeInTheDocument()
  expect(screen.getByText(/ainda não foi detalhado/)).toBeInTheDocument()
  expect(screen.getAllByRole('link', { name: 'Questões da disciplina' })[0]).toHaveAttribute('href', '/questoes?curso=5&disciplina=100')
})

it('curso inexistente informa em vez de abrir outro curso', async () => {
  backend(painel())
  renderizar(999)
  expect(await screen.findByRole('heading', { name: 'Curso não encontrado' })).toBeInTheDocument()
  expect(screen.queryByText('Soldado CBM')).not.toBeInTheDocument()
})

it('abre direto a aula pedida pelo cronograma (?aula=)', async () => {
  instalarFetch((chamada) => {
    if (chamada.url === '/api/editais') return respostaJson(200, [{ ...edital, materialPdfUrl: 'https://exemplo.test/material.pdf' }])
    if (chamada.url.startsWith('/api/dashboard')) return respostaJson(200, painel())
    throw new Error(`URL inesperada: ${chamada.url}`)
  })
  render(<MemoryRouter initialEntries={['/curso/5?aula=12']}><Routes>
    <Route path="/curso/:editalId" element={<TelaCurso token="token" onEncerrarSessao={vi.fn()} />} />
  </Routes></MemoryRouter>)
  expect(await screen.findByRole('heading', { name: 'Crase', level: 1 })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Voltar à lista' })).toBeInTheDocument()
})
