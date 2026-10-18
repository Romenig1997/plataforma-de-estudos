import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import TelaLogin from './TelaLogin'
import { ErroDeAutenticacao } from './autenticacao'
import { ErroDeRede } from './sessao'
import { instalarFetch, respostaJson } from './testes/ajuda'

const { entrar, sair, reenviarConfirmacao } = vi.hoisted(() => ({
  entrar: vi.fn(),
  sair: vi.fn(),
  reenviarConfirmacao: vi.fn(),
}))

vi.mock('./autenticacao', async (original) => ({
  ...(await original<typeof import('./autenticacao')>()),
  entrar,
  sair,
  reenviarConfirmacao,
}))

/**
 * Criterios de aceite da tela de login (HU02) com o Supabase Auth.
 *
 * O Supabase e simulado: `entrar` devolve o access token ou o erro ja
 * traduzido, e o perfil da sessao vem da API (`/api/auth/me`).
 */
describe('TelaLogin', () => {
  const TOKEN = 'access-token-do-supabase'
  const USUARIO = { id: 1, nome: 'Ana Souza', email: 'ana@email.com', perfil: 'ALUNO', avatarUrl: null }

  beforeEach(() => {
    entrar.mockReset()
    sair.mockReset().mockResolvedValue(undefined)
    reenviarConfirmacao.mockReset()
  })

  async function preencherEEntrar(email: string, senha: string) {
    const usuario = userEvent.setup()
    await usuario.type(screen.getByLabelText('E-mail'), email)
    await usuario.type(screen.getByLabelText('Senha'), senha)
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }))
  }

  it('entra com credenciais validas no Supabase e entrega token e perfil a casca', async () => {
    entrar.mockResolvedValue(TOKEN)
    const fetchFalso = instalarFetch(() => respostaJson(200, USUARIO))
    const onAutenticado = vi.fn()

    render(<TelaLogin onAutenticado={onAutenticado} onIrParaCadastro={vi.fn()} />)
    await preencherEEntrar('  ana@email.com ', 'senha1234')

    expect(entrar).toHaveBeenCalledWith('ana@email.com', 'senha1234')
    expect(onAutenticado).toHaveBeenCalledWith(TOKEN, USUARIO)
    expect(String(fetchFalso.mock.calls[0][0])).toBe('/api/auth/me')
    expect(new Headers(fetchFalso.mock.calls[0][1]?.headers).get('Authorization')).toBe(`Bearer ${TOKEN}`)
  })

  it('mostra o estado de carregamento enquanto o Supabase responde', async () => {
    let resolver: ((token: string) => void) | undefined
    entrar.mockReturnValue(new Promise<string>((aceitar) => { resolver = aceitar }))
    instalarFetch(() => respostaJson(200, USUARIO))

    render(<TelaLogin onAutenticado={vi.fn()} onIrParaCadastro={vi.fn()} />)
    await preencherEEntrar('ana@email.com', 'senha1234')

    const botao = await screen.findByRole('button', { name: 'Entrando...' }, { timeout: 5000 })
    expect(botao).toBeDisabled()
    expect(screen.getByLabelText('E-mail')).toBeDisabled()
    resolver?.(TOKEN)
  })

  it('exibe erro para credenciais invalidas sem abrir a sessao', async () => {
    entrar.mockRejectedValue(new ErroDeAutenticacao('E-mail ou senha inválidos.', 'geral', 'invalid_credentials'))
    const onAutenticado = vi.fn()

    render(<TelaLogin onAutenticado={onAutenticado} onIrParaCadastro={vi.fn()} />)
    await preencherEEntrar('ninguem@email.com', 'senha1234')

    expect(await screen.findByText('E-mail ou senha inválidos.')).toBeInTheDocument()
    expect(onAutenticado).not.toHaveBeenCalled()
  })

  it('e-mail nao confirmado oferece reenviar a confirmacao', async () => {
    entrar.mockRejectedValue(new ErroDeAutenticacao('Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.', 'geral', 'email_not_confirmed'))
    reenviarConfirmacao.mockResolvedValue(undefined)

    render(<TelaLogin onAutenticado={vi.fn()} onIrParaCadastro={vi.fn()} />)
    await preencherEEntrar('ana@email.com', 'senha1234')

    await userEvent.click(await screen.findByRole('button', { name: 'Reenviar confirmação de e-mail' }))
    expect(reenviarConfirmacao).toHaveBeenCalledWith('ana@email.com')
    expect(await screen.findByText(/enviamos um novo link/)).toBeInTheDocument()
  })

  it('nao chama o Supabase e marca os campos quando estao vazios', async () => {
    const onAutenticado = vi.fn()
    render(<TelaLogin onAutenticado={onAutenticado} onIrParaCadastro={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Informe o e-mail.')).toBeInTheDocument()
    expect(screen.getByText('Informe a senha.')).toBeInTheDocument()
    expect(entrar).not.toHaveBeenCalled()
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true')
  })

  it('nao chama o Supabase quando o e-mail nao tem formato valido', async () => {
    render(<TelaLogin onAutenticado={vi.fn()} onIrParaCadastro={vi.fn()} />)
    await preencherEEntrar('nao-e-um-email', 'senha1234')

    expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument()
    expect(entrar).not.toHaveBeenCalled()
  })

  it('distingue erro de rede de erro de credencial', async () => {
    entrar.mockRejectedValue(new ErroDeRede())
    render(<TelaLogin onAutenticado={vi.fn()} onIrParaCadastro={vi.fn()} />)
    await preencherEEntrar('ana@email.com', 'senha1234')

    expect(await screen.findByText(/Não foi possível conectar ao serviço de autenticação/)).toBeInTheDocument()
  })

  it('se o perfil nao carrega, encerra a sessao recem-aberta e avisa', async () => {
    entrar.mockResolvedValue(TOKEN)
    instalarFetch(() => { throw new TypeError('Failed to fetch') })
    const onAutenticado = vi.fn()

    render(<TelaLogin onAutenticado={onAutenticado} onIrParaCadastro={vi.fn()} />)
    await preencherEEntrar('ana@email.com', 'senha1234')

    expect(await screen.findByText(/Não foi possível conectar ao servidor/)).toBeInTheDocument()
    expect(sair).toHaveBeenCalled()
    expect(onAutenticado).not.toHaveBeenCalled()
  })

  it('leva para o cadastro pelo link alternativo', async () => {
    const onIrParaCadastro = vi.fn()
    render(<TelaLogin onAutenticado={vi.fn()} onIrParaCadastro={onIrParaCadastro} />)

    await userEvent.click(screen.getByRole('button', { name: 'Cadastre-se' }))
    expect(onIrParaCadastro).toHaveBeenCalled()
  })

  it('mostra o aviso herdado de uma sessao encerrada', () => {
    render(<TelaLogin onAutenticado={vi.fn()} onIrParaCadastro={vi.fn()} aviso="Sua sessão expirou. Faça login novamente." />)
    expect(screen.getByRole('alert')).toHaveTextContent('Sua sessão expirou. Faça login novamente.')
  })
})
