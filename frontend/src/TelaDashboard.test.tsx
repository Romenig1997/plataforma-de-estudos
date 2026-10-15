import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import TelaDashboard from './TelaDashboard'
import { instalarFetch, respostaJson } from './testes/ajuda'
import type { Dashboard } from './dashboard'

const base: Dashboard = {
  editalId: 1, editalTitulo: 'Edital CBM', totalTopicos: 2, topicosConcluidos: 1, progresso: 50, cronogramaDesatualizado: false,
  disciplinas: [{ id: 10, nome: 'Português', questoes: 0, acertos: 0, desempenho: null, topicos: [
    { id: 20, nome: 'Interpretação', pagina: 2, concluido: true, questoes: 0, acertos: 0 },
    { id: 21, nome: 'Gramática', pagina: 2, concluido: false, questoes: 0, acertos: 0 },
  ] }],
  proximasAtividades: [{ id: 1, data: '2026-10-19', inicio: '19:00:00', fim: '20:00:00', disciplinaId: 10, disciplina: 'Português', conteudoId: 21, conteudo: 'Gramática', pagina: 2 }],
}

const props = () => ({ token: 'token', onEncerrarSessao: vi.fn() })
const renderizar = (p = props()) => render(<MemoryRouter><TelaDashboard {...p} /></MemoryRouter>)

afterEach(() => vi.unstubAllGlobals())

describe('TelaDashboard', () => {
  it('mostra indicadores, desempenho sem dados e proximas atividades', async () => {
    instalarFetch(() => respostaJson(200, base))
    renderizar()
    expect(await screen.findByText('Edital CBM')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('1 de 2 tópicos concluídos')).toBeInTheDocument()
    expect(screen.getByText('Sem dados')).toBeInTheDocument()
    expect(screen.getByText('Sem respostas')).toBeInTheDocument()
    expect(screen.getByText(/19:00–20:00 · Português/)).toBeInTheDocument()
  })

  it('leva ao curso do plano para registrar estudos, sem formulario manual', async () => {
    instalarFetch(() => respostaJson(200, base))
    renderizar()
    await screen.findByText('Edital CBM')
    expect(screen.getByRole('link', { name: 'Continuar estudando' })).toHaveAttribute('href', '/curso/1')
    expect(screen.queryByRole('button', { name: 'Salvar registro' })).not.toBeInTheDocument()
  })

  it('avisa quando o cronograma esta desatualizado sem tratar como erro', async () => {
    instalarFetch(() => respostaJson(200, { ...base, cronogramaDesatualizado: true }))
    renderizar()
    const aviso = await screen.findByText(/Seu plano mudou/)
    expect(aviso.closest('[role="status"]')).not.toBeNull()
  })

  it('sem inscricao orienta a explorar cursos', async () => {
    instalarFetch(({ url }) => url === '/api/cursos/inscricoes' ? respostaJson(200, []) : respostaJson(204))
    renderizar()
    await screen.findByText(/Inscreva-se em um curso para acompanhar/)
    expect(screen.getByRole('link', { name: 'Explorar cursos' })).toHaveAttribute('href', '/app')
  })

  it('encerra sessao expirada e permite repetir falha de rede', async () => {
    instalarFetch(() => respostaJson(401))
    const p = props()
    const r = renderizar(p)
    await vi.waitFor(() => expect(p.onEncerrarSessao).toHaveBeenCalledWith('Sua sessão expirou. Faça login novamente.'))
    r.unmount()
    let falha = true
    instalarFetch(() => { if (falha) throw new Error('offline'); return respostaJson(200, base) })
    renderizar()
    await screen.findByText(/Não foi possível conectar/)
    falha = false
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByText('Edital CBM')).toBeInTheDocument()
  })
})
