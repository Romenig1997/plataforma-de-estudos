import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { clienteAuth } = vi.hoisted(() => ({
  clienteAuth: {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    resend: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    getSession: vi.fn(),
    getUser: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
}))

vi.mock('./supabase', () => ({ supabase: { auth: clienteAuth } }))

import {
  alterarSenha,
  cadastrar,
  entrar,
  ErroDeAutenticacao,
  observarSessao,
  sair,
  solicitarRedefinicao,
  traduzirErro,
} from './autenticacao'
import { ErroDeRede } from './sessao'

const erroDoSupabase = (code: string, status = 400) => new AuthApiError('mensagem em ingles', status, code)

/**
 * Integracao com o Supabase Auth (HU01/HU02): o que vai para o Supabase e
 * como cada recusa vira uma mensagem compreensivel em portugues.
 */
describe('autenticacao', () => {
  beforeEach(() => {
    Object.values(clienteAuth).forEach((funcao) => funcao.mockReset())
  })

  it('cadastra com o nome nos metadados e o link de confirmacao do proprio site', async () => {
    clienteAuth.signUp.mockResolvedValue({ data: { user: { identities: [{}] }, session: null }, error: null })

    expect(await cadastrar('Ana Souza', 'ana@email.com', 'senha1234')).toEqual({ sessao: 'confirmar-email' })
    expect(clienteAuth.signUp).toHaveBeenCalledWith({
      email: 'ana@email.com',
      password: 'senha1234',
      options: { data: { nome: 'Ana Souza' }, emailRedirectTo: `${window.location.origin}/confirmar-email` },
    })
  })

  it('cadastro sem confirmacao de e-mail ja devolve o token', async () => {
    clienteAuth.signUp.mockResolvedValue({ data: { user: { identities: [{}] }, session: { access_token: 'tok' } }, error: null })
    expect(await cadastrar('Ana', 'ana@email.com', 'senha1234')).toEqual({ sessao: 'iniciada', token: 'tok' })
  })

  it('nao permite e-mail duplicado, mesmo quando o Supabase oculta a duplicidade', async () => {
    clienteAuth.signUp.mockResolvedValue({ data: { user: { identities: [] }, session: null }, error: null })
    const ocultada = await cadastrar('Ana', 'ana@email.com', 'senha1234').catch((erro: unknown) => erro)
    expect(ocultada).toBeInstanceOf(ErroDeAutenticacao)
    expect((ocultada as ErroDeAutenticacao).campo).toBe('email')
    expect((ocultada as ErroDeAutenticacao).message).toBe('Já existe uma conta com este e-mail.')

    clienteAuth.signUp.mockResolvedValue({ data: { user: null, session: null }, error: erroDoSupabase('user_already_exists', 422) })
    await expect(cadastrar('Ana', 'ana@email.com', 'senha1234')).rejects.toThrow('Já existe uma conta com este e-mail.')
  })

  it('traduz as recusas do Supabase para o campo e a mensagem da tela', () => {
    const casos: Array<[string, string, string]> = [
      ['invalid_credentials', 'geral', 'E-mail ou senha inválidos.'],
      ['email_not_confirmed', 'geral', 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.'],
      ['weak_password', 'senha', 'A senha é fraca. Use pelo menos 8 caracteres, misturando letras e números.'],
      ['email_address_invalid', 'email', 'Informe um e-mail válido.'],
      ['over_email_send_rate_limit', 'geral', 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.'],
    ]
    for (const [codigo, campo, mensagem] of casos) {
      const erro = traduzirErro(erroDoSupabase(codigo)) as ErroDeAutenticacao
      expect(erro.campo).toBe(campo)
      expect(erro.message).toBe(mensagem)
    }
    expect(traduzirErro(new AuthRetryableFetchError('Failed to fetch', 0))).toBeInstanceOf(ErroDeRede)
  })

  it('entrar devolve o access token e recusa credenciais invalidas', async () => {
    clienteAuth.signInWithPassword.mockResolvedValue({ data: { session: { access_token: 'tok' } }, error: null })
    expect(await entrar('ana@email.com', 'senha1234')).toBe('tok')

    clienteAuth.signInWithPassword.mockResolvedValue({ data: { session: null }, error: erroDoSupabase('invalid_credentials') })
    await expect(entrar('ana@email.com', 'errada')).rejects.toThrow('E-mail ou senha inválidos.')
  })

  it('logout encerra a sessao local e nao quebra se o Supabase estiver fora', async () => {
    clienteAuth.signOut.mockRejectedValue(new Error('offline'))
    await expect(sair()).resolves.toBeUndefined()
    expect(clienteAuth.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  it('a recuperacao de senha volta para a tela de redefinicao do site', async () => {
    clienteAuth.resetPasswordForEmail.mockResolvedValue({ error: null })
    await solicitarRedefinicao('ana@email.com')
    expect(clienteAuth.resetPasswordForEmail).toHaveBeenCalledWith('ana@email.com', {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    })
  })

  it('alterar a senha confere a senha atual antes de trocar', async () => {
    clienteAuth.getUser.mockResolvedValue({ data: { user: { email: 'ana@email.com' } } })
    clienteAuth.signInWithPassword.mockResolvedValue({ data: { session: null }, error: erroDoSupabase('invalid_credentials') })

    const falha = await alterarSenha('errada', 'novaSenha123').catch((erro: unknown) => erro)
    expect((falha as ErroDeAutenticacao).message).toBe('A senha atual está incorreta.')
    expect(clienteAuth.updateUser).not.toHaveBeenCalled()

    clienteAuth.signInWithPassword.mockResolvedValue({ data: { session: {} }, error: null })
    clienteAuth.updateUser.mockResolvedValue({ error: null })
    await alterarSenha('senha1234', 'novaSenha123')
    expect(clienteAuth.updateUser).toHaveBeenCalledWith({ password: 'novaSenha123' })
  })

  it('observarSessao traduz os eventos do Supabase e permite cancelar', () => {
    const cancelar = vi.fn()
    clienteAuth.onAuthStateChange.mockImplementation((ouvinte: (evento: string, sessao: unknown) => void) => {
      ouvinte('INITIAL_SESSION', { access_token: 'tok' })
      ouvinte('TOKEN_REFRESHED', { access_token: 'tok2' })
      ouvinte('SIGNED_OUT', null)
      return { data: { subscription: { unsubscribe: cancelar } } }
    })
    const aoMudar = vi.fn()

    observarSessao(aoMudar)()

    expect(aoMudar.mock.calls).toEqual([['tok', 'inicial'], ['tok2', 'renovou'], [null, 'saiu']])
    expect(cancelar).toHaveBeenCalled()
  })
})
