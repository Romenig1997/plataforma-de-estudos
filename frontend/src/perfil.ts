/**
 * Perfil do usuario (HU03): leitura e atualizacao dos dados do proprio
 * cadastro.
 *
 * <p>Sigo o mesmo contrato de `sessao.ts`: token no cabecalho `Authorization`,
 * e os mesmos tres erros tipados (`ErroDeApi`, `ErroDeRede`, `SessaoEncerrada`)
 * para que a tela trate falha de rede, validacao e sessao expirada sem
 * misturar os tres.
 *
 * <p>`metaEstudoSemanal` e `objetivoMotivacao` sao opcionais: `null` significa
 * "nao preenchido" - a API devolve `null` e aceita `null` de volta.
 */
import { requisitarJson } from './api'

export type Perfil = {
  id: number
  nome: string
  email: string
  metaEstudoSemanal: number | null
  objetivoMotivacao: string | null
  temFoto?: boolean
}

/** O que o PUT /api/perfil recebe: o perfil sem o `id` (que vem do token). */
export type AtualizacaoDePerfil = Omit<Perfil, 'id' | 'temFoto'>

export const buscarPerfil = (token: string) => requisitarJson<Perfil>('/api/perfil', token)

export const salvarPerfil = (token: string, dados: AtualizacaoDePerfil) =>
  requisitarJson<Perfil>('/api/perfil', token, { metodo: 'PUT', json: dados })
