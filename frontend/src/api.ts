/**
 * Cliente HTTP unico da aplicacao.
 *
 * <p>Todos os modulos de API (`perfil.ts`, `editais.ts`, `planner.ts`...) usam
 * estas funcoes em vez de repetir o mesmo `fetch`: token no cabecalho
 * `Authorization`, falha de rede vira {@link ErroDeRede}, 401 de uma chamada
 * autenticada vira {@link SessaoEncerrada} e o resto vira {@link ErroDeApi}
 * com os erros por campo devolvidos pelo backend.
 */
import { ErroDeApi, ErroDeRede, SessaoEncerrada, lerErros } from './sessao'

/** Mensagem unica exibida no login quando a sessao expira em qualquer tela. */
export const MENSAGEM_SESSAO_EXPIRADA = 'Sua sessão expirou. Faça login novamente.'

export type OpcoesDeRequisicao = {
  metodo?: string
  /** Corpo serializado como JSON (acrescenta `Content-Type`). */
  json?: unknown
  /** Corpo multipart; o navegador define o boundary. */
  formulario?: FormData
}

/**
 * Faz a chamada e devolve a resposta ja validada (2xx). Sem `token`, a chamada
 * e publica e um 401 vira {@link ErroDeApi}, como no login.
 */
export async function requisitar(
  caminho: string,
  token?: string,
  opcoes: OpcoesDeRequisicao = {},
): Promise<Response> {
  const headers: Record<string, string> = {}
  if (opcoes.json !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  const init: RequestInit = { headers }
  if (opcoes.metodo) init.method = opcoes.metodo
  if (opcoes.json !== undefined) init.body = JSON.stringify(opcoes.json)
  else if (opcoes.formulario) init.body = opcoes.formulario

  let resposta: Response
  try {
    resposta = await fetch(caminho, init)
  } catch {
    throw new ErroDeRede()
  }

  if (resposta.status === 401 && token) throw new SessaoEncerrada()
  if (!resposta.ok) throw new ErroDeApi(resposta.status, await lerErros(resposta))
  return resposta
}

/** Chamada que sempre devolve JSON. */
export async function requisitarJson<T>(
  caminho: string,
  token?: string,
  opcoes?: OpcoesDeRequisicao,
): Promise<T> {
  const resposta = await requisitar(caminho, token, opcoes)
  return (await resposta.json()) as T
}

/** Chamada em que 204 significa "ainda nao existe" (plano, cronograma...). */
export async function requisitarOpcional<T>(
  caminho: string,
  token?: string,
  opcoes?: OpcoesDeRequisicao,
): Promise<T | null> {
  const resposta = await requisitar(caminho, token, opcoes)
  return resposta.status === 204 ? null : ((await resposta.json()) as T)
}

/**
 * Traduz uma falha para a mensagem da tela. Sessao expirada nao vira
 * mensagem: chama `onEncerrarSessao` e devolve `null`.
 */
export function mensagemDaFalha(
  falha: unknown,
  onEncerrarSessao: (motivo?: string) => void,
  padrao: string,
): string | null {
  if (falha instanceof SessaoEncerrada) {
    onEncerrarSessao(MENSAGEM_SESSAO_EXPIRADA)
    return null
  }
  if (falha instanceof ErroDeRede) return 'Não foi possível conectar ao servidor. Tente novamente.'
  if (falha instanceof ErroDeApi && falha.erros.length) {
    return falha.erros.map((erro) => erro.mensagem).join(' ')
  }
  return padrao
}
