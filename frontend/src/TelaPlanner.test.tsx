import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TelaPlanner from './TelaPlanner'
import { instalarFetch, respostaJson } from './testes/ajuda'

const edital = { id: 1, titulo: 'Edital CBM', orgao: 'CBM', ano: 2026, criadoEm: '', concursos: [], disciplinas: [
  { id: 10, nome: 'Português', pagina: 1, assuntos: [{ id: 20, nome: 'Interpretação', pagina: 1, subassuntos: [{ id: 21, nome: 'Gêneros', pagina: 2, subassuntos: [] }] }] },
  { id: 11, nome: 'Matemática', pagina: 3, assuntos: [] },
] }
const plano = { id: 1, metaHorasSemanais: 4, atualizadoEm: '', edital, disciplinas: [
  { disciplinaId: 10, nome: 'Português', prioridade: 'ALTA', minutosSemanais: 180 },
  { disciplinaId: 11, nome: 'Matemática', prioridade: 'BAIXA', minutosSemanais: 60 },
] }
const props = () => ({ token: 'token', onVoltar: vi.fn(), onEncerrarSessao: vi.fn() })
function api(salvo: typeof plano | null = null, catalogo = [edital], meta: number | null = 4) {
  return instalarFetch(({ url, init }) => {
    if (url === '/api/editais') return respostaJson(200, catalogo)
    if (url === '/api/perfil') return respostaJson(200, { metaEstudoSemanal: meta })
    if (url === '/api/planner') return init?.method === 'PUT' ? respostaJson(200, plano) : salvo ? respostaJson(200, salvo) : respostaJson(204)
    throw new Error(url)
  })
}
afterEach(() => vi.unstubAllGlobals())
describe('TelaPlanner', () => {
  it('usa meta do perfil e salva prioridades escolhidas', async () => {
    const fetch = api(); render(<TelaPlanner {...props()} />)
    expect(await screen.findByLabelText('Meta semanal (horas)')).toHaveValue(4)
    await userEvent.selectOptions(screen.getByLabelText('Prioridade — Português'), 'ALTA')
    await userEvent.selectOptions(screen.getByLabelText('Prioridade — Matemática'), 'BAIXA')
    await userEvent.click(screen.getByRole('button', { name: 'Gerar e salvar plano' }))
    expect(await screen.findByText('Plano semanal gerado e salvo.')).toBeInTheDocument()
    expect(screen.getByText('3h')).toBeInTheDocument()
    const chamada = fetch.mock.calls.find(c => c[1]?.method === 'PUT')
    expect(JSON.parse(String(chamada?.[1]?.body))).toEqual({ editalId: 1, metaHorasSemanais: 4, prioridades: [{ disciplinaId: 10, prioridade: 'ALTA' }, { disciplinaId: 11, prioridade: 'BAIXA' }] })
    expect(fetch.mock.calls.some(c => String(c[0]) === '/api/perfil' && c[1]?.method === 'PUT')).toBe(false)
  })
  it('restaura plano e prioridades salvas e permite consultar conteudos', async () => {
    api(plano); render(<TelaPlanner {...props()} />)
    expect(await screen.findByText('Plano semanal salvo')).toBeInTheDocument()
    expect(screen.getByLabelText('Prioridade — Português')).toHaveValue('ALTA')
    await userEvent.click(screen.getByText('Português (pág. 1)'))
    expect(screen.getByText('Gêneros (pág. 2)')).toBeVisible()
  })
  it('sem edital aprovado informa estado vazio sem formulario', async () => {
    api(null, []); render(<TelaPlanner {...props()} />)
    expect(await screen.findByText('Nenhum edital aprovado disponível. Aguarde a publicação de um edital.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Gerar e salvar plano' })).not.toBeInTheDocument()
  })
  it('sem meta bloqueia envio e aponta campo invalido', async () => {
    const fetch=api(null, [edital], null); render(<TelaPlanner {...props()} />)
    await screen.findByLabelText('Meta semanal (horas)')
    await userEvent.click(screen.getByRole('button', { name: 'Gerar e salvar plano' }))
    expect(screen.getByLabelText('Meta semanal (horas)')).toHaveAttribute('aria-invalid','true')
    expect(fetch.mock.calls.some(c=>c[1]?.method==='PUT')).toBe(false)
  })
  it('401 encerra sessao e erro de carga permite tentar novamente', async () => {
    const p=props(); instalarFetch(()=>respostaJson(401)); render(<TelaPlanner {...p} />)
    await waitFor(()=>expect(p.onEncerrarSessao).toHaveBeenCalled())
  })
  it('falha de rede oferece nova tentativa', async () => {
    vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('offline'))); render(<TelaPlanner {...props()} />)
    await screen.findByRole('button', { name: 'Tentar novamente' })
    api(); await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByLabelText('Meta semanal (horas)')).toHaveValue(4)
  })
})
