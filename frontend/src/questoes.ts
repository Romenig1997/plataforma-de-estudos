import { requisitarJson } from './api'
import { porCurso } from './cursos'

export type QuestaoRascunho = { editalId: number; conteudoId: number; enunciado: string; alternativas: string[]; gabarito: number; explicacao: string }
export type RevisaoQuestao = { id: number; questao: QuestaoRascunho; publicada: boolean }
export type Correcao = { correta: boolean; alternativa: number; gabarito: number; explicacao: string }
/** `resposta` e a ultima tentativa; `tentativas` conta todas. */
export type QuestaoAluno = { id: number; conteudoId: number; conteudo: string; enunciado: string; alternativas: string[]; resposta: Correcao | null; tentativas?: number }

/** Questoes do curso informado; sem curso, as do curso em foco. */
export const listarQuestoes = (token: string, editalId?: number | null) =>
  requisitarJson<QuestaoAluno[]>(porCurso('/api/questoes', editalId), token)

export const responderQuestao = (token: string, id: number, alternativa: number) =>
  requisitarJson<Correcao>(`/api/questoes/${id}/resposta`, token, { metodo: 'POST', json: { alternativa } })

export const listarRevisoes = (token: string, editalId: number) =>
  requisitarJson<RevisaoQuestao[]>(`/api/admin/questoes?editalId=${editalId}`, token)

export const salvarQuestao = (token: string, dados: QuestaoRascunho, id?: number) =>
  requisitarJson<RevisaoQuestao>(`/api/admin/questoes${id ? `/${id}` : ''}`, token, { metodo: id ? 'PUT' : 'POST', json: dados })

export const publicarQuestao = (token: string, id: number) =>
  requisitarJson<RevisaoQuestao>(`/api/admin/questoes/${id}/publicar`, token, { metodo: 'POST' })

export const importarQuestoes = (token: string, questoes: QuestaoRascunho[]) =>
  requisitarJson<RevisaoQuestao[]>('/api/admin/questoes/lote', token, { metodo: 'POST', json: { questoes } })
