/**
 * Sessao do usuario: onde o token JWT mora e como as chamadas autenticadas sao
 * feitas (HU02).
 *
 * <p>Decisao documentada com o responsavel: o token fica no `sessionStorage`.
 * Isso significa que
 *
 * <ul>
 *   <li>so existe enquanto a aba estiver aberta - fechar a aba encerra a sessao;
 *   <li>sobe para de existir quando a aba fecha, ao contrario do `localStorage`,
 *       que deixaria o token em disco entre sessoes do navegador.
 * </ul>
 *
 * <p>O que <strong>nao</strong> resolve: um token no `sessionStorage` continua
 * legivel por JavaScript, entao uma falha de XSS consegue ler o token. A
 * alternativa seria cookie httpOnly, que exige mudanca no backend e tratamento
 * de CSRF — mecanismo de seguranca a mais, fora do escopo da HU02.
 */

/** Chave usada no `sessionStorage`. Prefixo da aplicacao para nao colidir. */
const CHAVE_TOKEN = 'plataforma:token'

export type ErroDeCampo = {
  campo: string
  mensagem: string
}

export type RespostaDeErro = {
  erros?: ErroDeCampo[]
}

export type Usuario = {
  id: number
  nome: string
  email: string
}

/**
 * Resposta de `POST /api/auth/login`.
 *
 * <p>`expiraEmMinutos` nao e usado pelo frontend: quem detecta um token vencido
 * e o 401 do backend, e a tela e a unica que precisa agir.
 */
export type LoginResponse = Usuario & {
  token: string
  tipo: string
  expiraEmMinutos: number
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

export function guardarToken(token: string): void {
  sessionStorage.setItem(CHAVE_TOKEN, token)
}

export function lerToken(): string | null {
  return sessionStorage.getItem(CHAVE_TOKEN)
}

/**
 * Descarta o token. E o que faz o logout.
 *
 * <p>A API e sem estado: o servidor nao guarda lista de tokens emitidos, entao
 * nao existe "revogar" nada la dentro. Apagar o token e toda a garantia de que
 * o navegador deixa de apresenta-lo - o token so volta a valer se a pessoa
 * tiver uma copia dele.
 */
export function descartarToken(): void {
  sessionStorage.removeItem(CHAVE_TOKEN)
}

async function lerErros(resposta: Response): Promise<ErroDeCampo[]> {
  try {
    const dados = (await resposta.json()) as RespostaDeErro
    return dados.erros ?? []
  } catch {
    // Resposta sem JSON legivel: a tela usa uma mensagem generica.
    return []
  }
}

/** Faz login. Lanca {@link ErroDeApi} com 400 ou 401 em caso de recusa. */
export async function entrar(email: string, senha: string): Promise<LoginResponse> {
  let resposta: Response

  try {
    resposta = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    })
  } catch {
    throw new ErroDeRede()
  }

  if (resposta.ok) {
    return (await resposta.json()) as LoginResponse
  }

  throw new ErroDeApi(resposta.status, await lerErros(resposta))
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