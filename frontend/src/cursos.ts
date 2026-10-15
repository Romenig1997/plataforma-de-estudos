/**
 * Inscricoes do aluno nos cursos (editais aprovados). Cada inscricao e um
 * plano de estudo; uma delas fica "em foco" e e o curso que as telas abrem
 * quando nenhum curso e escolhido.
 */
import { requisitar, requisitarJson } from './api'
import type { Plano } from './planner'

export type Inscricao = {
  editalId: number
  titulo: string
  orgao: string
  ano: number
  emFoco: boolean
  metaHorasSemanais: number
  atualizadoEm: string
  totalTopicos: number
  topicosConcluidos: number
  progresso: number
}

export const listarInscricoes = (token: string) => requisitarJson<Inscricao[]>('/api/cursos/inscricoes', token)

/** Inscreve com a meta do perfil e prioridades normais; repetir nao duplica. */
export const inscrever = (token: string, editalId: number) =>
  requisitarJson<Plano>(`/api/cursos/${editalId}/inscricao`, token, { metodo: 'POST' })

/** Cancela a inscricao; o progresso registrado continua guardado. */
export async function cancelarInscricao(token: string, editalId: number): Promise<void> {
  await requisitar(`/api/cursos/${editalId}/inscricao`, token, { metodo: 'DELETE' })
}

export const definirFoco = (token: string, editalId: number) =>
  requisitarJson<Plano>('/api/cursos/foco', token, { metodo: 'PUT', json: { editalId } })

/** Parametro de consulta opcional `?editalId=` das leituras por curso. */
export function porCurso(caminho: string, editalId?: number | null): string {
  if (!editalId) return caminho
  return `${caminho}${caminho.includes('?') ? '&' : '?'}editalId=${editalId}`
}
