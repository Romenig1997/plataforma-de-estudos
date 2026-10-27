import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ExclusaoDeConta from './ExclusaoDeConta'
import { ErroDeAutenticacao } from './autenticacao'
import { instalarFetch, respostaJson } from './testes/ajuda'

const autenticacao = vi.hoisted(() => ({ entrar: vi.fn(), sair: vi.fn() }))
vi.mock('./autenticacao', async (original) => ({ ...(await original<typeof import('./autenticacao')>()), ...autenticacao }))

/** HU16: o aluno exclui a propria conta confirmando a senha. */
describe('ExclusaoDeConta', () => {
  beforeEach(() => {
    autenticacao.entrar.mockReset()
    autenticacao.sair.mockReset().mockResolvedValue(undefined)
  })
  afterEach(() => vi.unstubAllGlobals())

  async function abrir(onEncerrarSessao = vi.fn()) {
    render(<ExclusaoDeConta email="aluno@email.com" administrador={false} onEncerrarSessao={onEncerrarSessao} />)
    await userEvent.click(screen.getByRole('button', { name: 'Excluir minha conta' }))
    return onEncerrarSessao
  }

  it('confirma a senha, exclui com o token novo e encerra a sessao', async () => {
    autenticacao.entrar.mockResolvedValue('token-confirmado')
    const fetch = instalarFetch(({ url, init }) => {
      if (url === '/api/perfil' && init?.method === 'DELETE') return respostaJson(204)
      throw new Error(url)
    })
    const onEncerrarSessao = await abrir()

    await userEvent.type(screen.getByLabelText('Digite a sua senha para confirmar'), 'Estuda@2026')
    await userEvent.click(screen.getByRole('button', { name: 'Excluir definitivamente' }))

    await vi.waitFor(() => expect(onEncerrarSessao).toHaveBeenCalledWith(expect.stringContaining('Sua conta foi excluída')))
    expect(autenticacao.entrar).toHaveBeenCalledWith('aluno@email.com', 'Estuda@2026')
    expect((fetch.mock.calls[0][1]?.headers as Record<string, string>).Authorization).toBe('Bearer token-confirmado')
    expect(autenticacao.sair).toHaveBeenCalledWith('local')
  })

  it('senha errada nao exclui nada', async () => {
    autenticacao.entrar.mockRejectedValue(new ErroDeAutenticacao('E-mail ou senha inválidos.', 'geral', 'invalid_credentials'))
    const fetch = instalarFetch(() => { throw new Error('nao deveria chamar a API') })
    const onEncerrarSessao = await abrir()

    await userEvent.type(screen.getByLabelText('Digite a sua senha para confirmar'), 'errada123')
    await userEvent.click(screen.getByRole('button', { name: 'Excluir definitivamente' }))

    expect(await screen.findByText('Senha incorreta.')).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
    expect(onEncerrarSessao).not.toHaveBeenCalled()
  })

  it('exige a senha antes de tentar', async () => {
    await abrir()
    await userEvent.click(screen.getByRole('button', { name: 'Excluir definitivamente' }))

    expect(screen.getByText('Informe a sua senha para confirmar.')).toBeInTheDocument()
    expect(autenticacao.entrar).not.toHaveBeenCalled()
  })

  it('administrador ve a orientacao em vez do botao', () => {
    render(<ExclusaoDeConta email="admin@email.com" administrador onEncerrarSessao={vi.fn()} />)

    expect(screen.getByText(/Administradores não podem excluir a própria conta/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Excluir minha conta' })).not.toBeInTheDocument()
  })
})
