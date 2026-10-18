/**
 * Autenticacao com o Supabase Auth (HU01 e HU02).
 *
 * <p>Unico modulo que fala com o Supabase. Cadastro, login, logout,
 * confirmacao de e-mail e redefinicao de senha acontecem aqui; o resto do
 * frontend so recebe o access token e o envia para a API Java em `/api`.
 * As senhas nunca passam pelo backend da plataforma.
 *
 * <p>Os erros do Supabase viram {@link ErroDeAutenticacao} com mensagem em
 * portugues e o campo do formulario a que se referem.
 */
import { AuthError, type Session } from '@supabase/supabase-js'
import { ErroDeRede } from './sessao'
import { supabase } from './supabase'

export type CampoDeAutenticacao = 'nome' | 'email' | 'senha' | 'geral'

export class ErroDeAutenticacao extends Error {
  readonly campo: CampoDeAutenticacao
  readonly codigo: string | undefined

  constructor(mensagem: string, campo: CampoDeAutenticacao = 'geral', codigo?: string) {
    super(mensagem)
    this.campo = campo
    this.codigo = codigo
  }
}

export const MENSAGEM_NAO_CONFIGURADO =
  'A autenticação não está configurada. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'

function cliente() {
  if (!supabase) throw new ErroDeAutenticacao(MENSAGEM_NAO_CONFIGURADO)
  return supabase
}

/** Endereco para onde os links enviados por e-mail devolvem a pessoa. */
function enderecoDe(caminho: string): string {
  return `${window.location.origin}${caminho}`
}

/** Traduz um erro do Supabase Auth para a mensagem da tela. */
export function traduzirErro(erro: unknown): Error {
  if (erro instanceof ErroDeAutenticacao || erro instanceof ErroDeRede) return erro
  if (!(erro instanceof AuthError)) return new ErroDeAutenticacao('Não foi possível concluir a operação. Tente novamente.')
  // Falha de rede ou Supabase fora do ar.
  if (erro.status === 0 || erro.name === 'AuthRetryableFetchError') return new ErroDeRede()

  switch (erro.code) {
    case 'invalid_credentials':
      return new ErroDeAutenticacao('E-mail ou senha inválidos.', 'geral', erro.code)
    case 'email_not_confirmed':
      return new ErroDeAutenticacao('Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.', 'geral', erro.code)
    case 'user_already_exists':
    case 'email_exists':
      return new ErroDeAutenticacao('Já existe uma conta com este e-mail.', 'email', erro.code)
    case 'email_address_invalid':
      return new ErroDeAutenticacao('Informe um e-mail válido.', 'email', erro.code)
    case 'weak_password':
      return new ErroDeAutenticacao('A senha é fraca. Use pelo menos 8 caracteres, misturando letras e números.', 'senha', erro.code)
    case 'same_password':
      return new ErroDeAutenticacao('A nova senha deve ser diferente da atual.', 'senha', erro.code)
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return new ErroDeAutenticacao('Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.', 'geral', erro.code)
    case 'signup_disabled':
      return new ErroDeAutenticacao('Novos cadastros estão temporariamente desativados.', 'geral', erro.code)
    case 'session_not_found':
    case 'session_expired':
    case 'otp_expired':
      return new ErroDeAutenticacao('O link expirou ou já foi usado. Solicite um novo.', 'geral', erro.code)
    default:
      return new ErroDeAutenticacao('Não foi possível concluir a operação. Tente novamente.', 'geral', erro.code)
  }
}

/** Resultado do cadastro: com confirmacao de e-mail ligada, ainda nao ha sessao. */
export type ResultadoDoCadastro = { sessao: 'confirmar-email' } | { sessao: 'iniciada'; token: string }

/**
 * Cria a conta no Supabase Auth. O nome vai nos metadados e o gatilho do
 * banco cria o perfil com o papel ALUNO.
 */
export async function cadastrar(nome: string, email: string, senha: string): Promise<ResultadoDoCadastro> {
  let resposta
  try {
    resposta = await cliente().auth.signUp({
      email,
      password: senha,
      options: { data: { nome }, emailRedirectTo: enderecoDe('/confirmar-email') },
    })
  } catch (erro) {
    throw traduzirErro(erro)
  }
  if (resposta.error) throw traduzirErro(resposta.error)

  // Com a confirmacao de e-mail ligada, um e-mail ja cadastrado volta sem
  // identidades (o Supabase nao cria uma segunda conta).
  if (resposta.data.user && resposta.data.user.identities?.length === 0) {
    throw new ErroDeAutenticacao('Já existe uma conta com este e-mail.', 'email', 'user_already_exists')
  }
  const token = resposta.data.session?.access_token
  return token ? { sessao: 'iniciada', token } : { sessao: 'confirmar-email' }
}

/** Login com e-mail e senha. Devolve o access token da sessao criada. */
export async function entrar(email: string, senha: string): Promise<string> {
  let resposta
  try {
    resposta = await cliente().auth.signInWithPassword({ email, password: senha })
  } catch (erro) {
    throw traduzirErro(erro)
  }
  if (resposta.error) throw traduzirErro(resposta.error)
  return resposta.data.session.access_token
}

/**
 * Logout. `local` encerra a sessao deste navegador; `global` encerra as
 * sessoes de todos os dispositivos. A sessao local e apagada mesmo se o
 * Supabase estiver inacessivel.
 */
export async function sair(escopo: 'local' | 'global' = 'local'): Promise<void> {
  if (!supabase) return
  try {
    await supabase.auth.signOut({ scope: escopo })
  } catch {
    // signOut ja removeu a sessao local; a revogacao remota fica para depois.
  }
}

export async function reenviarConfirmacao(email: string): Promise<void> {
  const { error } = await cliente().auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: enderecoDe('/confirmar-email') },
  })
  if (error) throw traduzirErro(error)
}

export async function solicitarRedefinicao(email: string): Promise<void> {
  const { error } = await cliente().auth.resetPasswordForEmail(email, {
    redirectTo: enderecoDe('/redefinir-senha'),
  })
  if (error) throw traduzirErro(error)
}

/** Define a nova senha na sessao aberta pelo link de redefinicao. */
export async function definirNovaSenha(novaSenha: string): Promise<void> {
  const { data } = await cliente().auth.getSession()
  if (!data.session) {
    throw new ErroDeAutenticacao('O link expirou ou já foi usado. Solicite um novo.', 'geral', 'session_not_found')
  }
  const { error } = await cliente().auth.updateUser({ password: novaSenha })
  if (error) throw traduzirErro(error)
}

/** Troca a senha de quem esta logado, conferindo a senha atual antes. */
export async function alterarSenha(senhaAtual: string, novaSenha: string): Promise<void> {
  const { data } = await cliente().auth.getUser()
  const email = data.user?.email
  if (!email) throw new ErroDeAutenticacao('Sessão encerrada. Faça login novamente.', 'geral', 'session_not_found')

  const conferencia = await cliente().auth.signInWithPassword({ email, password: senhaAtual })
  if (conferencia.error) {
    throw conferencia.error.code === 'invalid_credentials'
      ? new ErroDeAutenticacao('A senha atual está incorreta.', 'senha', conferencia.error.code)
      : traduzirErro(conferencia.error)
  }
  const { error } = await cliente().auth.updateUser({ password: novaSenha })
  if (error) throw traduzirErro(error)
}

/** Access token da sessao guardada, ou `null` sem sessao. */
export async function tokenAtual(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

export type EventoDeSessao = 'inicial' | 'entrou' | 'renovou' | 'saiu' | 'recuperacao' | 'atualizou'

/**
 * Acompanha a sessao: chama `aoMudar` com o token atual na abertura da pagina,
 * no login, na renovacao automatica do token e no logout (inclusive em outra aba).
 */
export function observarSessao(aoMudar: (token: string | null, evento: EventoDeSessao) => void): () => void {
  if (!supabase) {
    aoMudar(null, 'inicial')
    return () => {}
  }
  const traducao: Record<string, EventoDeSessao> = {
    INITIAL_SESSION: 'inicial',
    SIGNED_IN: 'entrou',
    TOKEN_REFRESHED: 'renovou',
    SIGNED_OUT: 'saiu',
    PASSWORD_RECOVERY: 'recuperacao',
    USER_UPDATED: 'atualizou',
  }
  const { data } = supabase.auth.onAuthStateChange((evento: string, sessao: Session | null) => {
    aoMudar(sessao?.access_token ?? null, traducao[evento] ?? 'atualizou')
  })
  return () => data.subscription.unsubscribe()
}
