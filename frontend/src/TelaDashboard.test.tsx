import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import TelaDashboard from './TelaDashboard'
import { instalarFetch, respostaJson } from './testes/ajuda'
import type { Dashboard } from './dashboard'
import type { Analise } from './analise'

const base: Dashboard = {
  editalId: 1, editalTitulo: 'Edital CBM', totalTopicos: 3, topicosConcluidos: 1, progresso: 33.333, cronogramaDesatualizado: false,
  disciplinas: [
    { id: 10, nome: 'Português', questoes: 4, acertos: 3, desempenho: 75, topicos: [
      { id: 20, nome: 'Interpretação', pagina: 2, concluido: true, questoes: 4, acertos: 3 },
      { id: 21, nome: 'Gramática', pagina: 2, concluido: false, questoes: 0, acertos: 0 },
    ] },
    { id: 11, nome: 'Matemática', questoes: 0, acertos: 0, desempenho: null, topicos: [
      { id: 30, nome: 'Frações', pagina: 4, concluido: false, questoes: 0, acertos: 0 },
    ] },
  ],
  proximasAtividades: [{ id: 1, data: '2026-10-19', inicio: '19:00:00', fim: '20:00:00', disciplinaId: 10, disciplina: 'Português', conteudoId: 21, conteudo: 'Gramática', pagina: 2 }],
}
const semComparacao: Analise = { editalId: 1, editalTitulo: 'Edital CBM', analise: {
  desempenhoGeral: 75, comparacaoDisponivel: false, recomendacoes: [],
  disciplinas: [{ id: 10, nome: 'Português', questoes: 4, acertos: 3, desempenho: 75, abaixoDosDemais: false }, { id: 11, nome: 'Matemática', questoes: 0, acertos: 0, desempenho: null, abaixoDosDemais: false }],
} }

const props = () => ({ token: 'token', onEncerrarSessao: vi.fn() })
const renderizar = (p = props()) => render(<MemoryRouter><TelaDashboard {...p} /></MemoryRouter>)
function api(painel: Dashboard | null = base, analise: Analise | null = semComparacao) {
  return instalarFetch(({ url }) => {
    if (url === '/api/cursos/inscricoes') return respostaJson(200, [])
    if (url.startsWith('/api/analise')) return analise ? respostaJson(200, analise) : respostaJson(500)
    return painel ? respostaJson(200, painel) : respostaJson(204)
  })
}

afterEach(() => vi.unstubAllGlobals())

describe('TelaDashboard', () => {
  it('resume progresso, acertos e questoes com percentuais inteiros', async () => {
    api()
    renderizar()
    expect(await screen.findByText('Edital CBM')).toBeInTheDocument()
    expect(screen.getByText('33%')).toBeInTheDocument()
    expect(screen.getByText(/1 de 3 tópicos concluídos/)).toBeInTheDocument()
    expect(screen.getByText('3 de 4 questões')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Progresso geral dos estudos' })).toBeInTheDocument()
  })

  it('separa estudo e acertos por disciplina, com faixa em texto', async () => {
    api()
    renderizar()
    expect(await screen.findByRole('progressbar', { name: 'Acertos: 75% · 3 de 4 questões · Bom' })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Estudo: 1 de 2 tópicos' })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Acertos: Sem respostas ainda' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Praticar Matemática' })).toHaveAttribute('href', '/questoes?curso=1&disciplina=11')
    expect(screen.getByText(/última tentativa de cada questão/)).toBeInTheDocument()
  })

  it('sem comparacao orienta a responder duas disciplinas', async () => {
    api()
    renderizar()
    expect(await screen.findByText(/pelo menos duas disciplinas para comparar/)).toBeInTheDocument()
  })

  it('destaca onde focar e marca a disciplina abaixo das demais', async () => {
    api(base, { ...semComparacao, analise: { ...semComparacao.analise, comparacaoDisponivel: true,
      disciplinas: [{ ...semComparacao.analise.disciplinas[0] }, { ...semComparacao.analise.disciplinas[1], questoes: 4, acertos: 1, desempenho: 25, abaixoDosDemais: true }],
      recomendacoes: [{ disciplinaId: 11, disciplina: 'Matemática', mensagem: 'Revise Matemática conforme seus resultados.' }] } })
    renderizar()
    expect(await screen.findByText('Revise Matemática conforme seus resultados.')).toBeInTheDocument()
    // Um atalho no destaque e outro no cartao da disciplina, os dois para as questoes dela.
    const atalhos = screen.getAllByRole('link', { name: 'Praticar Matemática' })
    expect(atalhos).toHaveLength(2)
    atalhos.forEach(link => expect(link).toHaveAttribute('href', '/questoes?curso=1&disciplina=11'))
    expect(screen.getByText('Abaixo das demais')).toBeInTheDocument()
  })

  it('continua util quando a analise falha', async () => {
    api(base, null)
    renderizar()
    expect(await screen.findByText('Edital CBM')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Por disciplina' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('mostra a proxima sessao e leva ao curso para registrar estudos', async () => {
    api()
    renderizar()
    expect(await screen.findByText(/19:00 · Português — Gramática/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Continuar estudando' })).toHaveAttribute('href', '/curso/1')
    expect(screen.getByRole('link', { name: 'Abrir cronograma' })).toHaveAttribute('href', '/cronograma')
  })

  it('avisa quando o cronograma esta desatualizado sem tratar como erro', async () => {
    api({ ...base, cronogramaDesatualizado: true })
    renderizar()
    const aviso = await screen.findByText(/Seu plano mudou/)
    expect(aviso.closest('[role="status"]')).not.toBeNull()
  })

  it('sem inscricao orienta a explorar cursos', async () => {
    api(null)
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
    instalarFetch(({ url }) => { if (falha) throw new Error('offline'); return url.startsWith('/api/analise') ? respostaJson(200, semComparacao) : respostaJson(200, base) })
    renderizar()
    await screen.findByText(/Não foi possível conectar/)
    falha = false
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByText('Edital CBM')).toBeInTheDocument()
  })
})
