import { afterEach, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import TelaQuestoes from './TelaQuestoes'
import { instalarFetch, respostaJson, type ChamadaFetch } from './testes/ajuda'

const questao = { id: 1, conteudoId: 10, conteudo: 'Interpretação', enunciado: 'Qual é a conclusão do texto?', alternativas: ['Primeira', 'Segunda', 'Terceira', 'Quarta'], resposta: null }
const outra = { ...questao, id: 2, conteudoId: 30, conteudo: 'Frações', enunciado: 'Quanto é 1/2 + 1/2?' }
const plano = { id: 1, metaHorasSemanais: 2, atualizadoEm: '', disciplinas: [], edital: { id: 5, titulo: 'Edital', orgao: 'CBM', ano: 2026, criadoEm: '', materialPdfUrl: null, concursos: [], disciplinas: [
  { id: 100, nome: 'Português', pagina: 1, assuntos: [{ id: 10, nome: 'Interpretação', pagina: 1, subassuntos: [] }] },
  { id: 200, nome: 'Matemática', pagina: 2, assuntos: [{ id: 29, nome: 'Aritmética', pagina: 2, subassuntos: [{ id: 30, nome: 'Frações', pagina: 2, subassuntos: [] }] }] },
] } }

const props = () => ({ token: 'token', onEncerrarSessao: vi.fn() })
const renderizar = (p = props(), rota = '/questoes') => render(<MemoryRouter initialEntries={[rota]}><TelaQuestoes {...p} /></MemoryRouter>)

/** Backend com as questoes e o plano; `resposta` trata o POST. */
function backend(questoes: unknown[], resposta?: (chamada: ChamadaFetch) => Response) {
  return instalarFetch((chamada) => {
    if (chamada.url === '/api/planner') return respostaJson(200, plano)
    if (chamada.url === '/api/cursos/inscricoes') return respostaJson(200, [])
    if (chamada.init?.method === 'POST' && resposta) return resposta(chamada)
    return respostaJson(200, questoes)
  })
}

afterEach(() => vi.unstubAllGlobals())

it('nao revela gabarito antes de responder e exige alternativa junto da questao', async () => {
  const fetch = backend([questao])
  renderizar()
  await screen.findByText(questao.enunciado)
  expect(screen.queryByText(/Gabarito:/)).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Responder questão 1' }))
  const erro = screen.getByText('Selecione uma alternativa antes de responder.')
  expect(erro.closest('section')).toHaveAttribute('aria-labelledby', 'questao-1')
  expect(fetch.mock.calls.some(c => c[1]?.method === 'POST')).toBe(false)
})

it('envia somente alternativa e mostra correcao do servidor', async () => {
  const fetch = backend([questao], () => respostaJson(200, { correta: false, alternativa: 1, gabarito: 0, explicacao: 'A primeira segue o texto.' }))
  renderizar()
  await screen.findByText(questao.enunciado)
  await userEvent.click(screen.getByLabelText('B. Segunda'))
  await userEvent.click(screen.getByRole('button', { name: 'Responder questão 1' }))
  expect(await screen.findByText('Resposta incorreta.')).toBeInTheDocument()
  expect(screen.getByText('Gabarito: A.')).toBeInTheDocument()
  expect(screen.getByText('A primeira segue o texto.')).toBeInTheDocument()
  expect(screen.getByText('1 de 1')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Responder questão 1' })).not.toBeInTheDocument()
  expect(JSON.parse(String(fetch.mock.calls.find(c => c[1]?.method === 'POST')?.[1]?.body))).toEqual({ alternativa: 1 })
})

it('restaura resposta corrigida e leva ao desempenho', async () => {
  backend([{ ...questao, resposta: { correta: true, alternativa: 0, gabarito: 0, explicacao: 'Explicação' } }])
  renderizar()
  expect(await screen.findByText('Resposta correta.')).toBeInTheDocument()
  expect(screen.getByLabelText('A. Primeira')).toBeDisabled()
  expect(screen.getByRole('link', { name: 'Ver desempenho' })).toHaveAttribute('href', '/dashboard?curso=5')
})

it('filtra pela disciplina vinda do caderno da tela do curso', async () => {
  backend([questao, outra])
  renderizar(props(), '/questoes?disciplina=200')
  expect(await screen.findByText(outra.enunciado)).toBeInTheDocument()
  expect(screen.queryByText(questao.enunciado)).not.toBeInTheDocument()
  expect(screen.getByLabelText('Disciplina')).toHaveValue('200')
  await userEvent.selectOptions(screen.getByLabelText('Disciplina'), '')
  expect(await screen.findByText(questao.enunciado)).toBeInTheDocument()
})

it('pagina cadernos longos', async () => {
  backend(Array.from({ length: 12 }, (_, i) => ({ ...questao, id: i + 1, enunciado: `Enunciado ${i + 1}` })))
  renderizar()
  await screen.findByText('Enunciado 1')
  expect(screen.queryByText('Enunciado 11')).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Próxima' }))
  expect(await screen.findByText('Enunciado 11')).toBeInTheDocument()
  expect(screen.getByText('Página 2 de 2')).toBeInTheDocument()
})

it('com mais de um curso escolhe o curso e busca as questoes dele', async () => {
  const inscricoes = [
    { editalId: 5, titulo: 'Edital', orgao: 'CBM', ano: 2026, emFoco: true, metaHorasSemanais: 2, atualizadoEm: '', totalTopicos: 2, topicosConcluidos: 0, progresso: 0 },
    { editalId: 7, titulo: 'Edital PM', orgao: 'PM', ano: 2026, emFoco: false, metaHorasSemanais: 4, atualizadoEm: '', totalTopicos: 1, topicosConcluidos: 0, progresso: 0 },
  ]
  const fetch = instalarFetch(({ url }) => {
    if (url === '/api/cursos/inscricoes') return respostaJson(200, inscricoes)
    if (url.startsWith('/api/planner')) return respostaJson(200, plano)
    return respostaJson(200, url.includes('editalId=7') ? [outra] : [questao])
  })
  renderizar()
  expect(await screen.findByText(questao.enunciado)).toBeInTheDocument()
  await userEvent.selectOptions(await screen.findByLabelText('Curso'), '7')
  expect(await screen.findByText(outra.enunciado)).toBeInTheDocument()
  expect(fetch.mock.calls.some(c => String(c[0]) === '/api/questoes?editalId=7')).toBe(true)
})

it('trata ausencia de questoes e sessao expirada', async () => {
  backend([])
  const r = renderizar()
  expect(await screen.findByText(/Nenhuma questão publicada/)).toBeInTheDocument()
  r.unmount()
  instalarFetch(() => respostaJson(401))
  const p = props()
  renderizar(p)
  await vi.waitFor(() => expect(p.onEncerrarSessao).toHaveBeenCalled())
})
