/**
 * Area admin (HU04): recurso restrito que so ADMIN acessa.
 *
 * <p>Mesmo contrato de `sessao.ts`: token no cabecalho `Authorization` e os
 * mesmos tres erros tipados (`ErroDeApi`, `ErroDeRede`, `SessaoEncerrada`).
 * O 403 chega como `ErroDeApi` com o campo `autorizacao` — a tela mostra a
 * mensagem da API sem encerrar a sessao.
 */
import { requisitarJson } from './api'
import type { PerfilDeAcesso } from './sessao'

export type UsuarioAdmin = {
  id: number
  nome: string
  email: string
  perfil: PerfilDeAcesso
}

/** Lista as contas cadastradas. Rota restrita: so a authority ADMIN passa. */
export const listarUsuarios = (token: string) => requisitarJson<UsuarioAdmin[]>('/api/admin/usuarios', token)
