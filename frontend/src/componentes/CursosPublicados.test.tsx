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
  sigla: 'OE',
  bannerVersao: null,
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

  it('admin envia e remove o banner e edita orgao e sigla pela capa do curso', async () => {
    const chamadas: { url: string; init?: RequestInit }[] = []
    vi.stubGlobal('fetch', vi.fn((entrada: string | URL, init?: RequestInit) => {
      const url = String(entrada); chamadas.push({ url, init })
      if (url === '/api/editais') return Promise.resolve(respostaJson(200, [{ ...CURSO, sigla: 'OE', bannerVersao: null }]))
      if (url === '/api/admin/editais/7/banner' && init?.method === 'POST') return Promise.resolve(respostaJson(200, { bannerVersao: 123 }))
      if (url === '/api/admin/editais/7/banner' && init?.method === 'DELETE') return Promise.resolve(respostaJson(204))
      if (url === '/api/admin/editais/7/orgao') return Promise.resolve(respostaJson(200, { ...CURSO, orgao: 'Polícia Civil', sigla: 'PC-PE', bannerVersao: 123 }))
      throw new Error(url)
    }))
    const { container } = render(<CursosPublicados token={TOKEN} onExcluido={onExcluido} onEncerrarSessao={onEncerrarSessao} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Editar capa de Direito Penal' }))

    await userEvent.upload(screen.getByLabelText('Banner do card'), new File(['x'], 'banner.png', { type: 'image/png' }))
    expect(await screen.findByText('Banner enviado.')).toBeInTheDocument()
    expect(chamadas.find(c => c.init?.method === 'POST')?.init?.body).toBeInstanceOf(FormData)
    expect(container.querySelector('img.curso-capa__imagem')).toHaveAttribute('src', '/api/editais/7/banner?v=123')

    const orgao = screen.getByLabelText('Nome do órgão'), sigla = screen.getByLabelText('Sigla')
    await userEvent.clear(orgao); await userEvent.type(orgao, 'Polícia Civil'); await userEvent.clear(sigla); await userEvent.type(sigla, 'PC-PE')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar órgão e sigla' }))
    expect(await screen.findByText('Órgão e sigla salvos.')).toBeInTheDocument()
    expect(JSON.parse(String(chamadas.find(c => c.url.endsWith('/orgao'))?.init?.body))).toEqual({ orgao: 'Polícia Civil', sigla: 'PC-PE' })
    expect(screen.getByRole('cell', { name: 'Polícia Civil' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Remover banner' }))
    expect(await screen.findByText(/Banner removido/)).toBeInTheDocument()
    expect(container.querySelector('img.curso-capa__imagem')).toBeNull()
  })

  it('recusa banner que nao e PNG ou JPEG sem chamar a API', async () => {
    const fetchFalso = instalarApi({ ok: true, status: 204 } as Response)
    render(<CursosPublicados token={TOKEN} onExcluido={onExcluido} onEncerrarSessao={onEncerrarSessao} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Editar capa de Direito Penal' }))
    await userEvent.upload(screen.getByLabelText('Banner do card'), new File(['x'], 'banner.gif', { type: 'image/gif' }), { applyAccept: false })
    expect(screen.getByText('Selecione uma imagem PNG ou JPEG de até 2 MB.')).toBeInTheDocument()
    expect(fetchFalso.mock.calls.some(([url]) => String(url).includes('/banner'))).toBe(false)
  })
})
