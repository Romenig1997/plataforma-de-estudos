import type { EditalAprovado } from './editais'
import { requisitarOpcional } from './api'
import { porCurso } from './cursos'

export type Prioridade = 'BAIXA' | 'NORMAL' | 'ALTA'
export type GerarPlano = {
  editalId: number
  metaHorasSemanais: number
  prioridades: { disciplinaId: number; prioridade: Prioridade }[]
}
export type Plano = {
  id: number
  metaHorasSemanais: number
  atualizadoEm: string
  edital: EditalAprovado
  disciplinas: { disciplinaId: number; nome: string; prioridade: Prioridade; minutosSemanais: number }[]
  emFoco?: boolean
}

function requisicao(token: string, dados?: GerarPlano): Promise<Plano | null> {
  return requisitarOpcional<Plano>('/api/planner', token, dados ? { metodo: 'PUT', json: dados } : {})
}

/** Plano do curso informado; sem curso, o do curso em foco. */
export const buscarPlano = (token: string, editalId?: number | null) =>
  editalId ? requisitarOpcional<Plano>(porCurso('/api/planner', editalId), token) : requisicao(token)
export async function gerarPlano(token: string, dados: GerarPlano): Promise<Plano> {
  const plano = await requisicao(token, dados)
  if (!plano) throw new Error('O servidor não devolveu o plano gerado.')
  return plano
}
export function formatarTempo(minutos: number): string {
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  return horas ? `${horas}h${resto ? ` ${resto}min` : ''}` : `${resto}min`
}

export const PESOS: Record<Prioridade, number> = { BAIXA: 1, NORMAL: 2, ALTA: 3 }

/**
 * Previa da divisao da meta em minutos, com o mesmo metodo do backend
 * (DistribuidorSemanal): parte inteira proporcional ao peso e os minutos que
 * sobram vao para os maiores restos, desempatando pelo id da disciplina.
 */
export function distribuirMinutos(horas: number, entradas: { disciplinaId: number; prioridade: Prioridade }[]): Record<number, number> {
  if (!Number.isInteger(horas) || horas < 1 || horas > 168 || !entradas.length) return {}
  const total = horas * 60
  const pesos = entradas.reduce((soma, e) => soma + PESOS[e.prioridade], 0)
  const ordenadas = [...entradas].sort((a, b) => a.disciplinaId - b.disciplinaId)
  const minutos: Record<number, number> = {}
  for (const e of ordenadas) minutos[e.disciplinaId] = Math.floor((total * PESOS[e.prioridade]) / pesos)
  const restantes = total - Object.values(minutos).reduce((soma, m) => soma + m, 0)
  const porResto = [...ordenadas].sort((a, b) =>
    ((total * PESOS[b.prioridade]) % pesos) - ((total * PESOS[a.prioridade]) % pesos) || a.disciplinaId - b.disciplinaId)
  for (let i = 0; i < restantes; i++) minutos[porResto[i].disciplinaId] += 1
  return minutos
}
