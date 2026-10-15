import { requisitar } from './api'
import type { LoginResponse } from './sessao'

/** Operacoes de conta: as publicas (sem token) e as da sessao atual. */
const enviar = (url: string, dados?: unknown, token?: string) =>
  requisitar(url, token, { metodo: 'POST', json: dados })

export async function solicitarRedefinicao(email: string) { await enviar('/api/auth/solicitar-redefinicao', { email }) }
export async function reenviarConfirmacao(email: string) { await enviar('/api/auth/reenvio-confirmacao', { email }) }
export async function confirmarEmail(token: string) { await enviar('/api/auth/confirmar-email', { token }) }
export async function redefinirSenha(token: string, novaSenha: string) { await enviar('/api/auth/redefinir-senha', { token, novaSenha }) }

export async function alterarSenha(token: string, senhaAtual: string, novaSenha: string): Promise<LoginResponse> {
  const resposta = await enviar('/api/auth/alterar-senha', { senhaAtual, novaSenha }, token)
  return resposta.json() as Promise<LoginResponse>
}

export async function encerrarTodasAsSessoes(token: string) { await enviar('/api/auth/encerrar-sessoes', undefined, token) }
