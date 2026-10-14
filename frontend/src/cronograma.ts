import { ErroDeApi, ErroDeRede, SessaoEncerrada, lerErros } from './sessao'

export type Disponibilidade = { diaSemana: number; inicio: string; fim: string }
export type GerarCronograma = { semanaInicio: string; disponibilidades: Disponibilidade[] }
export type Atividade = { id: number; data: string; inicio: string; fim: string; disciplinaId: number; disciplina: string; conteudoId: number; conteudo: string; pagina: number }
export type Cronograma = GerarCronograma & { id: number; metaHorasSemanais: number; editalTitulo: string; desatualizado: boolean; geradoEm: string; atividades: Atividade[] }

async function requisicao(token: string, dados?: GerarCronograma): Promise<Cronograma | null> {
  let resposta: Response
  try {
    resposta = await fetch('/api/cronograma', {
      method: dados ? 'PUT' : 'GET',
      headers: { Authorization: `Bearer ${token}`, ...(dados ? { 'Content-Type': 'application/json' } : {}) },
      ...(dados ? { body: JSON.stringify(dados) } : {}),
    })
  } catch { throw new ErroDeRede() }
  if (resposta.status === 401) throw new SessaoEncerrada()
  if (!resposta.ok) throw new ErroDeApi(resposta.status, await lerErros(resposta))
  return resposta.status === 204 ? null : await resposta.json() as Cronograma
}
export const buscarCronograma = (token: string) => requisicao(token)
export async function gerarCronograma(token: string, dados: GerarCronograma): Promise<Cronograma> {
  const salvo = await requisicao(token, dados)
  if (!salvo) throw new Error('O servidor não devolveu o cronograma.')
  return salvo
}
export const DIAS = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo']
export function minutosHorario(horario: string): number {
  const match = /^(\d{2}):(\d{2})(?::00)?$/.exec(horario)
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return NaN
  return Number(match[1]) * 60 + Number(match[2])
}
export function inicioSemana(): string {
  const data = new Date()
  data.setDate(data.getDate() - (data.getDay() + 6) % 7)
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`
}
export function dataLegivel(data: string): string {
  return new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
}
