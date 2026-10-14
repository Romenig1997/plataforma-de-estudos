import type { EditalAprovado } from './editais'
import { ErroDeApi, ErroDeRede, SessaoEncerrada, lerErros } from './sessao'

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
}

async function requisicao(token: string, dados?: GerarPlano): Promise<Plano | null> {
  let resposta: Response
  try {
    resposta = await fetch('/api/planner', {
      method: dados ? 'PUT' : 'GET',
      headers: { Authorization: `Bearer ${token}`, ...(dados ? { 'Content-Type': 'application/json' } : {}) },
      ...(dados ? { body: JSON.stringify(dados) } : {}),
    })
  } catch { throw new ErroDeRede() }
  if (resposta.status === 401) throw new SessaoEncerrada()
  if (!resposta.ok) throw new ErroDeApi(resposta.status, await lerErros(resposta))
  if (resposta.status === 204) return null
  return await resposta.json() as Plano
}

export const buscarPlano = (token: string) => requisicao(token)
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
