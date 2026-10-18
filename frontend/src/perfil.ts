/**
 * Perfil do usuario (HU03): leitura e atualizacao dos dados do proprio
 * cadastro, gravados na tabela de perfis do Supabase pela API.
 *
 * <p>`perfil` e o papel de acesso (ADMIN ou ALUNO) e `avatarUrl` e a URL
 * publica da foto no Supabase Storage. O e-mail pertence ao Supabase Auth e
 * so e exibido. `metaEstudoSemanal` e `objetivoMotivacao` sao opcionais:
 * `null` significa "nao preenchido".
 */
import { requisitarJson } from './api'
import type { PerfilDeAcesso } from './sessao'

export type Perfil = {
  id: number
  nome: string
  email: string
  perfil: PerfilDeAcesso
  avatarUrl: string | null
  metaEstudoSemanal: number | null
  objetivoMotivacao: string | null
  atualizadoEm?: string
}

/** O que o PUT /api/perfil recebe: apenas os campos editaveis. */
export type AtualizacaoDePerfil = Pick<Perfil, 'nome' | 'metaEstudoSemanal' | 'objetivoMotivacao'>

export const buscarPerfil = (token: string) => requisitarJson<Perfil>('/api/perfil', token)

export const salvarPerfil = (token: string, dados: AtualizacaoDePerfil) =>
  requisitarJson<Perfil>('/api/perfil', token, { metodo: 'PUT', json: dados })
