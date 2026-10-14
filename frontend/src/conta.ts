import { ErroDeApi, ErroDeRede, lerErros, SessaoEncerrada, type LoginResponse } from './sessao'

async function chamar(url: string, dados?: unknown, token?: string): Promise<Response> {
  try {
    const resposta = await fetch(url, {
      method: 'POST',
      headers: { ...(dados !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(dados !== undefined ? { body: JSON.stringify(dados) } : {}),
    })
    if (resposta.status === 401) throw new SessaoEncerrada()
    if (!resposta.ok) throw new ErroDeApi(resposta.status, await lerErros(resposta))
    return resposta
  } catch (erro) {
    if (erro instanceof ErroDeApi || erro instanceof SessaoEncerrada) throw erro
    throw new ErroDeRede()
  }
}

export async function solicitarRedefinicao(email: string) { await chamar('/api/auth/solicitar-redefinicao', { email }) }
export async function reenviarConfirmacao(email: string) { await chamar('/api/auth/reenvio-confirmacao', { email }) }
export async function confirmarEmail(token: string) { await chamar('/api/auth/confirmar-email', { token }) }
export async function redefinirSenha(token: string, novaSenha: string) { await chamar('/api/auth/redefinir-senha', { token, novaSenha }) }
export async function alterarSenha(token: string, senhaAtual: string, novaSenha: string): Promise<LoginResponse> {
  const resposta = await chamar('/api/auth/alterar-senha', { senhaAtual, novaSenha }, token)
  return resposta.json() as Promise<LoginResponse>
}
export async function encerrarTodasAsSessoes(token: string) { await chamar('/api/auth/encerrar-sessoes', undefined, token) }
