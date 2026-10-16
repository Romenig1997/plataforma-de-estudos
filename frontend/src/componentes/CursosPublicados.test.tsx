import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import CursosPublicados from './CursosPublicados'
import type { EditalAprovado, ImportacaoDeEdital } from '../editais'
import { respostaJson } from '../testes/ajuda'

/**
 * Exclusao de curso (edital aprovado) pela area admin: cobre os cursos sem
 * importacao ligada, que so podem sair por DELETE /api/admin/editais/{id}.
 */

const TOKEN = 'token-do-admin'

const CURSO: EditalAprovado = {
  id: 7,
  titulo: 'Direito Penal',
  orgao: 'Orgao Exemplo',
  ano: 2026,
  criadoEm: '2026-10-13T10:00:00Z',
  materialPdfUrl: null,
  possuiPdfOriginal: false,
  disciplinas: [],
  concursos: [],
} as unknown as EditalAprovado

function instalarApi(exclusao: Response) {
  const fetchFalso = vi.fn((entrada: string | URL, init?: RequestInit) => {
    const url = String(entrada)
    if (url === '/api/editais') return Promise.resolve(respostaJson(200, [CURSO]))
    if (url === '/api/admin/editais/7' && init?.method === 'DELETE') return Promise.resolve(exclusao)
    throw new Error(`Sem resposta configurada para ${url} (${String(init?.method ?? 'GET')})`)
  })
  vi.stubGlobal('fetch', fetchFalso)
  return fetchFalso
}

const onEncerrarSessao = vi.fn()
const onExcluido = vi.fn()

beforeEach(() => {
  onEncerrarSessao.mockReset()
  onExcluido.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('CursosPublicados', () => {
  it('exclui o curso pelo id do edital depois da confirmacao', async () => {
    const fetchFalso = instalarApi({ ok: true, status: 204 } as Response)
    const confirmar = vi.fn(() => true)
    vi.stubGlobal('confirm', confirmar)

    render(<CursosPublicados token={TOKEN} onExcluido={onExcluido} onEncerrarSessao={onEncerrarSessao} />)

    expect(await screen.findByRole('heading', { name: 'Cursos publicados' })).toBeInTheDocument()
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir curso Direito Penal' }))

    expect(confirmar).toHaveBeenCalledWith(expect.stringContaining('Direito Penal'))
    const exclusao = fetchFalso.mock.calls.find(([url]) => String(url) === '/api/admin/editais/7')
    expect(exclusao?.[1]?.method).toBe('DELETE')
    expect(new Headers(exclusao?.[1]?.headers).get('Authorization')).toBe(`Bearer ${TOKEN}`)
    expect(await screen.findByText('Curso "Direito Penal" excluído com sucesso.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Excluir curso Direito Penal' })).not.toBeInTheDocument()
    expect(onExcluido).toHaveBeenCalledTimes(1)
  })

  it('nao exclui quando o admin cancela a confirmacao', async () => {
    const fetchFalso = instalarApi({ ok: true, status: 204 } as Response)
    vi.stubGlobal('confirm', vi.fn(() => false))

    render(<CursosPublicados token={TOKEN} onExcluido={onExcluido} onEncerrarSessao={onEncerrarSessao} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir curso Direito Penal' }))

    expect(fetchFalso.mock.calls.some(([url]) => String(url) === '/api/admin/editais/7')).toBe(false)
    expect(screen.getByRole('button', { name: 'Excluir curso Direito Penal' })).toBeInTheDocument()
    expect(onExcluido).not.toHaveBeenCalled()
  })

  it('curso aprovado por importacao indica a exclusao pela importacao', async () => {
    instalarApi({ ok: true, status: 204 } as Response)
    const importacao = { id: 3, editalAprovadoId: 7 } as ImportacaoDeEdital

    render(
      <CursosPublicados
        token={TOKEN}
        importacoes={[importacao]}
        onExcluido={onExcluido}
        onEncerrarSessao={onEncerrarSessao}
      />,
    )

    expect(await screen.findByText('Excluir pela importação acima')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Excluir curso Direito Penal' })).not.toBeInTheDocument()
  })

  it('401 na exclusao encerra a sessao', async () => {
    instalarApi(respostaJson(401, { erros: [] }))
    vi.stubGlobal('confirm', vi.fn(() => true))

    render(<CursosPublicados token={TOKEN} onExcluido={onExcluido} onEncerrarSessao={onEncerrarSessao} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir curso Direito Penal' }))

    await vi.waitFor(() => expect(onEncerrarSessao).toHaveBeenCalled())
    expect(onExcluido).not.toHaveBeenCalled()
  })
})
