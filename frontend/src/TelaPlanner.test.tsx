import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import TelaPlanner from './TelaPlanner'
import { instalarFetch, respostaJson } from './testes/ajuda'

const edital = { id: 1, titulo: 'Edital CBM', orgao: 'CBM', ano: 2026, criadoEm: '', materialPdfUrl: null, concursos: [], disciplinas: [
  { id: 10, nome: 'Português', pagina: 1, assuntos: [{ id: 20, nome: 'Interpretação', pagina: 1, subassuntos: [{ id: 21, nome: 'Gêneros', pagina: 2, subassuntos: [] }] }] },
  { id: 11, nome: 'Matemática', pagina: 3, assuntos: [] },
] }
const outro = { ...edital, id: 2, titulo: 'Edital PM', orgao: 'PM', disciplinas: [{ id: 30, nome: 'Direito', pagina: 1, assuntos: [] }] }
const plano = { id: 1, metaHorasSemanais: 4, atualizadoEm: '', edital, disciplinas: [
  { disciplinaId: 10, nome: 'Português', prioridade: 'ALTA', minutosSemanais: 180 },
  { disciplinaId: 11, nome: 'Matemática', prioridade: 'BAIXA', minutosSemanais: 60 },
] }
const props = () => ({ token: 'token', onEncerrarSessao: vi.fn() })
const renderizar = (p = props()) => render(<MemoryRouter><TelaPlanner {...p} /></MemoryRouter>)

function api(salvo: typeof plano | null = null, catalogo = [edital], meta: number | null = 4) {
  return instalarFetch(({ url, init }) => {
    if (url === '/api/editais') return respostaJson(200, catalogo)
    if (url === '/api/perfil') return respostaJson(200, { metaEstudoSemanal: meta })
    if (url === '/api/planner') return init?.method === 'PUT' ? respostaJson(200, plano) : salvo ? respostaJson(200, salvo) : respostaJson(204)
    throw new Error(url)
  })
}

/** Marca a prioridade de uma disciplina no grupo "Prioridade — <nome>". */
async function escolher(disciplina: string, prioridade: 'Baixa' | 'Normal' | 'Alta') {
  await userEvent.click(within(screen.getByRole('group', { name: `Prioridade — ${disciplina}` })).getByRole('radio', { name: prioridade }))
}

afterEach(() => vi.unstubAllGlobals())

describe('TelaPlanner', () => {
  it('usa meta do perfil, mostra previa da divisao e salva prioridades escolhidas', async () => {
    const fetch = api()
    renderizar()
    expect(await screen.findByLabelText('Meta semanal (horas)')).toHaveValue(4)
    expect(screen.getByText(/Cerca de 34min por dia/)).toBeInTheDocument()
    await escolher('Português', 'Alta')
    await escolher('Matemática', 'Baixa')
    const portugues = screen.getByRole('group', { name: 'Prioridade — Português' })
    expect(within(portugues).getByText('3h')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Gerar e salvar plano' }))
    expect(await screen.findByText(/Plano semanal gerado e salvo/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Atualize o cronograma' })).toHaveAttribute('href', '/cronograma')
    expect(screen.getByRole('heading', { name: 'Plano semanal salvo' })).toBeInTheDocument()
    const chamada = fetch.mock.calls.find(c => c[1]?.method === 'PUT')
    expect(JSON.parse(String(chamada?.[1]?.body))).toEqual({ editalId: 1, metaHorasSemanais: 4, prioridades: [{ disciplinaId: 10, prioridade: 'ALTA' }, { disciplinaId: 11, prioridade: 'BAIXA' }] })
    expect(fetch.mock.calls.some(c => String(c[0]) === '/api/perfil' && c[1]?.method === 'PUT')).toBe(false)
  })

  it('mostra o plano salvo primeiro, restaura prioridades e indica alteracoes pendentes', async () => {
    api(plano)
    renderizar()
    expect(await screen.findByRole('heading', { name: 'Plano semanal salvo' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver conteúdo no curso' })).toHaveAttribute('href', '/curso/1')
    expect(within(screen.getByRole('group', { name: 'Prioridade — Português' })).getByRole('radio', { name: 'Alta' })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Plano em dia' })).toBeDisabled()
    await escolher('Matemática', 'Alta')
    expect(screen.getByText('Você tem alterações não salvas.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeEnabled()
  })

  it('avisa sobre a troca de edital antes de salvar', async () => {
    api(plano, [edital, outro])
    renderizar()
    await screen.findByRole('heading', { name: 'Plano semanal salvo' })
    expect(screen.queryByText(/passa a ser o seu curso ativo/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: /Edital PM/ }))
    expect(screen.getByText(/passa a ser o seu curso ativo/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Trocar de edital e salvar' })).toBeInTheDocument()
  })

  it('aplica uma prioridade a todas as disciplinas', async () => {
    api()
    renderizar()
    await screen.findByLabelText('Meta semanal (horas)')
    await userEvent.click(screen.getByRole('button', { name: 'Todas alta' }))
    for (const nome of ['Português', 'Matemática']) {
      expect(within(screen.getByRole('group', { name: `Prioridade — ${nome}` })).getByRole('radio', { name: 'Alta' })).toBeChecked()
    }
  })

  it('sem edital aprovado informa estado vazio sem formulario', async () => {
    api(null, [])
    renderizar()
    expect(await screen.findByText('Nenhum edital aprovado disponível. Aguarde a publicação de um edital.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Gerar e salvar plano' })).not.toBeInTheDocument()
  })

  it('sem meta bloqueia envio e aponta campo invalido', async () => {
    const fetch = api(null, [edital], null)
    renderizar()
    await screen.findByLabelText('Meta semanal (horas)')
    await userEvent.click(screen.getByRole('button', { name: 'Gerar e salvar plano' }))
    expect(screen.getByLabelText('Meta semanal (horas)')).toHaveAttribute('aria-invalid', 'true')
    expect(fetch.mock.calls.some(c => c[1]?.method === 'PUT')).toBe(false)
  })

  it('falha ao ler o perfil nao impede o planner', async () => {
    instalarFetch(({ url }) => {
      if (url === '/api/editais') return respostaJson(200, [edital])
      if (url === '/api/perfil') return respostaJson(500)
      return respostaJson(204)
    })
    renderizar()
    expect(await screen.findByLabelText('Meta semanal (horas)')).toHaveValue(null)
  })

  it('401 encerra sessao', async () => {
    const p = props()
    instalarFetch(() => respostaJson(401))
    renderizar(p)
    await waitFor(() => expect(p.onEncerrarSessao).toHaveBeenCalled())
  })

  it('falha de rede oferece nova tentativa', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    renderizar()
    await screen.findByRole('button', { name: 'Tentar novamente' })
    api()
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByLabelText('Meta semanal (horas)')).toHaveValue(4)
  })
})
