import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import TelaPlanner from './TelaPlanner'
import { instalarFetch, respostaJson } from './testes/ajuda'

const edital = { id: 1, titulo: 'Edital CBM', orgao: 'CBM', ano: 2026, criadoEm: '', materialPdfUrl: null, concursos: [], disciplinas: [
  { id: 10, nome: 'Português', pagina: 1, assuntos: [] },
  { id: 11, nome: 'Matemática', pagina: 3, assuntos: [] },
] }
const outro = { ...edital, id: 2, titulo: 'Edital PM', orgao: 'PM', disciplinas: [{ id: 30, nome: 'Direito', pagina: 1, assuntos: [] }] }
const plano = { id: 1, metaHorasSemanais: 4, atualizadoEm: '', edital, emFoco: true, disciplinas: [
  { disciplinaId: 10, nome: 'Português', prioridade: 'NORMAL', minutosSemanais: 120 },
  { disciplinaId: 11, nome: 'Matemática', prioridade: 'NORMAL', minutosSemanais: 120 },
] }
const planoPm = { id: 2, metaHorasSemanais: 6, atualizadoEm: '', edital: outro, emFoco: false, disciplinas: [
  { disciplinaId: 30, nome: 'Direito', prioridade: 'NORMAL', minutosSemanais: 360 },
] }
const inscricao = (p: typeof plano | typeof planoPm) => ({ editalId: p.edital.id, titulo: p.edital.titulo, orgao: p.edital.orgao, ano: 2026, emFoco: p.emFoco, metaHorasSemanais: p.metaHorasSemanais, atualizadoEm: '', totalTopicos: 0, topicosConcluidos: 0, progresso: 0 })

const props = () => ({ token: 'token', onEncerrarSessao: vi.fn() })
const renderizar = (rota = '/planner', p = props()) => render(<MemoryRouter initialEntries={[rota]}><TelaPlanner {...p} /></MemoryRouter>)

/** Backend com os planos inscritos; o PUT devolve o plano com as prioridades enviadas. */
function api(planos: (typeof plano | typeof planoPm)[] = [plano]) {
  return instalarFetch(({ url, init }) => {
    if (url === '/api/cursos/inscricoes') return respostaJson(200, planos.map(inscricao))
    if (url === '/api/cursos/foco') return respostaJson(200, { ...planoPm, emFoco: true })
    if (url.startsWith('/api/planner')) {
      if (init?.method === 'PUT') {
        const corpo = JSON.parse(String(init.body)) as { metaHorasSemanais: number; prioridades: { disciplinaId: number; prioridade: string }[] }
        return respostaJson(200, { ...plano, metaHorasSemanais: corpo.metaHorasSemanais, disciplinas: plano.disciplinas.map(d => ({ ...d, prioridade: corpo.prioridades.find(x => x.disciplinaId === d.disciplinaId)?.prioridade })) })
      }
      const id = Number(new URLSearchParams(url.split('?')[1]).get('editalId'))
      const escolhido = id ? planos.find(p => p.edital.id === id) : planos.find(p => p.emFoco)
      return escolhido ? respostaJson(200, escolhido) : respostaJson(204)
    }
    throw new Error(url)
  })
}

async function escolher(disciplina: string, prioridade: 'Baixa' | 'Normal' | 'Alta') {
  await userEvent.click(within(screen.getByRole('group', { name: `Prioridade — ${disciplina}` })).getByRole('radio', { name: prioridade }))
}

afterEach(() => vi.unstubAllGlobals())

describe('TelaPlanner', () => {
  it('mostra o plano do curso em foco, a previa e salva as prioridades', async () => {
    const fetch = api()
    renderizar()
    expect(await screen.findByRole('heading', { name: 'Plano semanal salvo' })).toBeInTheDocument()
    expect(screen.getByLabelText('Meta semanal (horas)')).toHaveValue(4)
    expect(screen.getByText(/Cerca de 34min por dia/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Plano em dia' })).toBeDisabled()
    await escolher('Português', 'Alta')
    await escolher('Matemática', 'Baixa')
    expect(within(screen.getByRole('group', { name: 'Prioridade — Português' })).getByText('3h')).toBeInTheDocument()
    expect(screen.getByText('Você tem alterações não salvas.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    expect(await screen.findByText(/Plano semanal gerado e salvo/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Atualize o cronograma' })).toHaveAttribute('href', '/cronograma')
    const chamada = fetch.mock.calls.find(c => c[1]?.method === 'PUT')
    expect(JSON.parse(String(chamada?.[1]?.body))).toEqual({ editalId: 1, metaHorasSemanais: 4, prioridades: [{ disciplinaId: 10, prioridade: 'ALTA' }, { disciplinaId: 11, prioridade: 'BAIXA' }] })
  })

  it('lista os cursos inscritos e abre o plano do curso escolhido', async () => {
    const fetch = api([plano, planoPm])
    renderizar('/planner?curso=2')
    expect(await screen.findByText('Edital PM — 2026')).toBeInTheDocument()
    const abas = screen.getByRole('navigation', { name: 'Cursos inscritos' })
    expect(within(abas).getByRole('link', { name: /Edital PM/ })).toHaveAttribute('aria-current', 'page')
    expect(within(abas).getByRole('link', { name: /Edital CBM/ })).toHaveAttribute('href', '/planner?curso=1')
    expect(within(abas).getByRole('link', { name: '+ Adicionar curso' })).toHaveAttribute('href', '/app#explorar-cursos')
    expect(fetch.mock.calls.some(c => String(c[0]) === '/api/planner?editalId=2')).toBe(true)
  })

  it('permite tornar foco um curso que nao esta em foco', async () => {
    const fetch = api([plano, planoPm])
    renderizar('/planner?curso=2')
    await userEvent.click(await screen.findByRole('button', { name: 'Definir este curso como foco' }))
    await waitFor(() => expect(fetch.mock.calls.find(c => String(c[0]) === '/api/cursos/foco')?.[1]?.method).toBe('PUT'))
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

  it('sem inscricao orienta a explorar cursos', async () => {
    api([])
    renderizar()
    expect(await screen.findByText('Você ainda não está inscrito em nenhum curso')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Explorar cursos' })).toHaveAttribute('href', '/app#explorar-cursos')
    expect(screen.queryByLabelText('Meta semanal (horas)')).not.toBeInTheDocument()
  })

  it('meta invalida bloqueia envio e aponta campo invalido', async () => {
    const fetch = api()
    renderizar()
    const meta = await screen.findByLabelText('Meta semanal (horas)')
    await userEvent.clear(meta)
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    expect(meta).toHaveAttribute('aria-invalid', 'true')
    expect(fetch.mock.calls.some(c => c[1]?.method === 'PUT')).toBe(false)
  })

  it('401 encerra sessao', async () => {
    const p = props()
    instalarFetch(() => respostaJson(401))
    renderizar('/planner', p)
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
