import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import TelaAdmin from './TelaAdmin'
import { instalarFetch, respostaJson } from './testes/ajuda'

/**
 * Criterios da area admin (HU04): a tela restrita que so ADMIN ve.
 *
 * <p>O botao de entrada e a preocupacao da TelaAutenticada (testado em
 * App.test.tsx). Aqui a tela e montada direto, com um `fetch` falso por
 * cenario, para cobrir a listagem, o 403 de quem forçou a entrada e as
 * falhas de sessao e de rede.
 */
describe('TelaAdmin', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  const TOKEN = 'token-da-sessao'

  const USUARIOS = [
    { id: 7, nome: 'Ana Souza', email: 'ana@email.com', perfil: 'ADMIN' as const },
    { id: 9, nome: 'Bruno Lima', email: 'bruno@email.com', perfil: 'ALUNO' as const },
  ]

  it('lista os usuarios pedindo o recurso com o token no cabecalho', async () => {
    const fetchFalso = instalarFetch(() => respostaJson(200, USUARIOS))

    render(<TelaAdmin token={TOKEN} onEncerrarSessao={vi.fn()} onVoltar={vi.fn()} onIrParaEditais={vi.fn()} />)

    expect(await screen.findByRole('heading', { name: 'Área admin' })).toBeInTheDocument()
    expect(screen.getByText('Ana Souza')).toBeInTheDocument()
    expect(screen.getByText('bruno@email.com')).toBeInTheDocument()
    expect(screen.getByText('ADMIN')).toBeInTheDocument()
    expect(screen.getByText('ALUNO')).toBeInTheDocument()

    expect(String(fetchFalso.mock.calls[0][0])).toBe('/api/admin/usuarios')
    expect(new Headers(fetchFalso.mock.calls[0][1]?.headers).get('Authorization')).toBe(
      `Bearer ${TOKEN}`,
    )
  })

  it('mostra o estado vazio quando nao ha usuarios cadastrados', async () => {
    instalarFetch(() => respostaJson(200, []))

    render(<TelaAdmin token={TOKEN} onEncerrarSessao={vi.fn()} onVoltar={vi.fn()} onIrParaEditais={vi.fn()} />)

    expect(await screen.findByText('Nenhum usuário cadastrado.')).toBeInTheDocument()
  })

  it('mostra o 403 da area admin sem encerrar a sessao', async () => {
    const onEncerrarSessao = vi.fn()
    instalarFetch(() =>
      respostaJson(403, {
        erros: [
          { campo: 'autorizacao', mensagem: 'Voce nao tem permissao para acessar este recurso.' },
        ],
      }),
    )

    render(<TelaAdmin token={TOKEN} onEncerrarSessao={onEncerrarSessao} onVoltar={vi.fn()} onIrParaEditais={vi.fn()} />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Voce nao tem permissao para acessar este recurso.',
    )
    expect(onEncerrarSessao).not.toHaveBeenCalled()
  })

  it('encerra a sessao quando o token deixa de valer (401)', async () => {
    const onEncerrarSessao = vi.fn()
    instalarFetch(() =>
      respostaJson(401, {
        erros: [{ campo: 'autenticacao', mensagem: 'Faca login para acessar este recurso.' }],
      }),
    )

    render(<TelaAdmin token={TOKEN} onEncerrarSessao={onEncerrarSessao} onVoltar={vi.fn()} onIrParaEditais={vi.fn()} />)

    await screen.findByRole('heading', { name: 'Área admin' })
    await waitFor(() => expect(onEncerrarSessao).toHaveBeenCalledTimes(1))
    expect(onEncerrarSessao).toHaveBeenCalledWith('Sua sessão expirou. Faça login novamente.')
  })

  it('mostra o erro de rede e permite tentar de novo', async () => {
    const fetchFalso = instalarFetch(() => {
      throw new TypeError('Failed to fetch')
    })

    render(<TelaAdmin token={TOKEN} onEncerrarSessao={vi.fn()} onVoltar={vi.fn()} onIrParaEditais={vi.fn()} />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Não foi possível conectar ao servidor/,
    )

    fetchFalso.mockImplementation(() =>
      Promise.resolve(respostaJson(200, USUARIOS)),
    )

    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByText('Ana Souza')).toBeInTheDocument()
  })

  it('o botao Voltar devolve para a area autenticada', async () => {
    const onVoltar = vi.fn()
    instalarFetch(() => respostaJson(200, USUARIOS))

    render(<TelaAdmin token={TOKEN} onEncerrarSessao={vi.fn()} onVoltar={onVoltar} onIrParaEditais={vi.fn()} />)

    await screen.findByRole('heading', { name: 'Área admin' })

    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(onVoltar).toHaveBeenCalledTimes(1)
  })

  it('o botao Importar editais abre a tela da HU07', async () => {
    const onIrParaEditais = vi.fn()
    instalarFetch(() => respostaJson(200, USUARIOS))

    render(<TelaAdmin token={TOKEN} onEncerrarSessao={vi.fn()} onVoltar={vi.fn()} onIrParaEditais={onIrParaEditais} />)

    await screen.findByRole('heading', { name: 'Área admin' })

    await userEvent.click(screen.getByRole('button', { name: 'Importar editais' }))
    expect(onIrParaEditais).toHaveBeenCalledTimes(1)
  })
})