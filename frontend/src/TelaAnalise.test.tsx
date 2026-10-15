import { afterEach, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import TelaAnalise from './TelaAnalise'
import { instalarFetch, respostaJson } from './testes/ajuda'

const dados = { editalId: 1, editalTitulo: 'Edital teste', analise: { desempenhoGeral: null, comparacaoDisponivel: false, disciplinas: [{ id: 1, nome: 'Português', questoes: 0, acertos: 0, desempenho: null, abaixoDosDemais: false }], recomendacoes: [] } }
const props = () => ({ token: 'token', onEncerrarSessao: vi.fn() })
const renderizar = (p = props()) => render(<MemoryRouter><TelaAnalise {...p} /></MemoryRouter>)

afterEach(() => vi.unstubAllGlobals())

it('dados insuficientes sem formularios ou recomendacoes ficticias', async () => {
  instalarFetch(() => respostaJson(200, dados))
  renderizar()
  expect(await screen.findByText('Dados insuficientes para análise.')).toBeInTheDocument()
  expect(screen.getByText('Sem dados')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Responder questões' })).toHaveAttribute('href', '/questoes')
  expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
})

it('exibe resultados comparacoes e recomendacoes recebidas do servidor', async () => {
  instalarFetch(() => respostaJson(200, { ...dados, analise: { desempenhoGeral: 60, comparacaoDisponivel: true, disciplinas: [{ id: 1, nome: 'Português', questoes: 10, acertos: 4, desempenho: 40, abaixoDosDemais: true }], recomendacoes: [{ disciplinaId: 1, disciplina: 'Português', mensagem: 'Revise Português conforme seus resultados.' }] } }))
  renderizar()
  expect(await screen.findByText('60%')).toBeInTheDocument()
  expect(screen.getByText('40% — 4 acertos em 10 questões')).toBeInTheDocument()
  expect(screen.getByText('Abaixo das demais disciplinas.')).toBeInTheDocument()
  expect(screen.getByText('Revise Português conforme seus resultados.')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Praticar Português' })).toHaveAttribute('href', '/questoes?disciplina=1')
})

it('sem plano informa dependencia e leva ao planner', async () => {
  instalarFetch(() => respostaJson(204))
  renderizar()
  await screen.findByText(/Selecione e salve um plano/)
  expect(screen.getByRole('link', { name: 'Criar meu plano' })).toHaveAttribute('href', '/planner')
})

it('encerra sessao expirada e permite repetir erro de rede', async () => {
  instalarFetch(() => respostaJson(401))
  const p = props()
  const r = renderizar(p)
  await vi.waitFor(() => expect(p.onEncerrarSessao).toHaveBeenCalled())
  r.unmount()
  let falha = true
  instalarFetch(() => { if (falha) throw new Error('offline'); return respostaJson(200, dados) })
  renderizar()
  await screen.findByText(/Não foi possível conectar/)
  falha = false
  await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  expect(await screen.findByText('Edital teste')).toBeInTheDocument()
})
