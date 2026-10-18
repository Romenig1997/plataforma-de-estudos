/**
 * Contratos da sessao autenticada (HU02).
 *
 * <p>A sessao em si (login, renovacao do token e logout) e do Supabase Auth,
 * em `autenticacao.ts`. Aqui ficam os tipos compartilhados, os erros
 * tipados das chamadas a API e a leitura do usuario da sessao em
 * `GET /api/auth/me`, que informa o papel (ADMIN/ALUNO) e a foto.
 */

export type ErroDeCampo = {
  campo: string
  mensagem: string
}

export type RespostaDeErro = {
  erros?: ErroDeCampo[]
}

/** Perfis de acesso da HU04. O banco e a fonte de verdade. */
export type PerfilDeAcesso = 'ADMIN' | 'ALUNO'

export type Usuario = {
  id: number
  nome: string
  email: string
  perfil: PerfilDeAcesso
  /** URL publica da foto no Supabase Storage; `null` sem foto. */
  avatarUrl: string | null
}

/** Erro de validacao ou de credencial devolvido pela API, com o status HTTP. */
export class ErroDeApi extends Error {
  readonly status: number
  readonly erros: ErroDeCampo[]

  constructor(status: number, erros: ErroDeCampo[] = []) {
    super(erros[0]?.mensagem ?? 'Erro inesperado.')
    this.status = status
    this.erros = erros
  }

  /** Mensagem devolvida pela API para um campo especifico do formulario. */
  mensagemDoCampo(campo: string): string | undefined {
    return this.erros.find((erro) => erro.campo === campo)?.mensagem
  }
}

/** O backend nao respondeu (servidor parado, rede fora, CORS bloqueado). */
export class ErroDeRede extends Error {
  constructor() {
    super('Não foi possível conectar ao servidor.')
  }
}

/**
 * A sessao nao vale mais: token expirado, ausente ou de usuario que nao existe
 * mais. A tela autenticada usa isso para voltar para o login.
 */
export class SessaoEncerrada extends Error {
  constructor() {
    super('Sessão encerrada. Faça login novamente.')
  }
}

/**
 * Le a lista de erros de uma resposta de erro da API. Exportado porque o
 * módulo de perfil (HU03) consome exatamente o mesmo contrato.
 */
export async function lerErros(resposta: Response): Promise<ErroDeCampo[]> {
  try {
    const dados = (await resposta.json()) as RespostaDeErro
    return dados.erros ?? []
  } catch {
    // Resposta sem JSON legivel: a tela usa uma mensagem generica.
    return []
  }
}

/**
 * Le os dados do usuario da sessao atual. E o recurso protegido da HU02.
 *
 * <p>Lanca {@link SessaoEncerrada} em 401 (token expirado ou invalido), que a
 * tela autenticada trata voltando para o login.
 */
export async function buscarSessaoAtual(token: string): Promise<Usuario> {
  let resposta: Response

  try {
    resposta = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    throw new ErroDeRede()
  }

  if (resposta.status === 401) {
    throw new SessaoEncerrada()
  }

  if (!resposta.ok) {
    throw new ErroDeApi(resposta.status, await lerErros(resposta))
  }

  return (await resposta.json()) as Usuario
}