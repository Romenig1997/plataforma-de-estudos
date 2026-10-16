import { requisitarOpcional } from './api'

export type Disponibilidade = { diaSemana: number; inicio: string; fim: string }
export type GerarCronograma = { semanaInicio: string; disponibilidades: Disponibilidade[] }
export type Atividade = { id: number; data: string; inicio: string; fim: string; disciplinaId: number; disciplina: string; conteudoId: number; conteudo: string; pagina: number; editalId?: number; concluido?: boolean }
/** Curso que entrou na agenda combinada. */
export type CursoDaAgenda = { editalId: number; titulo: string; metaHorasSemanais: number }
export type Cronograma = GerarCronograma & { id: number; metaHorasSemanais: number; editalTitulo: string; desatualizado: boolean; geradoEm: string; atividades: Atividade[]; cursos?: CursoDaAgenda[] }

function requisicao(token: string, dados?: GerarCronograma): Promise<Cronograma | null> {
  return requisitarOpcional<Cronograma>('/api/cronograma', token, dados ? { metodo: 'PUT', json: dados } : {})
}
export const buscarCronograma = (token: string) => requisicao(token)
export async function gerarCronograma(token: string, dados: GerarCronograma): Promise<Cronograma> {
  const salvo = await requisicao(token, dados)
  if (!salvo) throw new Error('O servidor não devolveu o cronograma.')
  return salvo
}
export const DIAS = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo']
/** Linha editavel do formulario de horarios; `chave` so identifica a linha na tela. */
export type LinhaDeHorario = Disponibilidade & { chave: number }
/** Minutos livres informados, ignorando horarios incompletos ou invertidos. */
export function minutosDisponiveis(linhas: Disponibilidade[]): number {
  return linhas.reduce((soma, l) => {
    const duracao = minutosHorario(l.fim) - minutosHorario(l.inicio)
    return soma + (Number.isFinite(duracao) && duracao > 0 ? duracao : 0)
  }, 0)
}
export function minutosHorario(horario: string): number {
  const match = /^(\d{2}):(\d{2})(?::00)?$/.exec(horario)
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return NaN
  return Number(match[1]) * 60 + Number(match[2])
}
const paraTexto = (data: Date) =>
  `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`

export function inicioSemana(): string {
  const data = new Date()
  data.setDate(data.getDate() - (data.getDay() + 6) % 7)
  return paraTexto(data)
}
/** Data local de hoje no formato AAAA-MM-DD. */
export const hojeLocal = () => paraTexto(new Date())
/** Soma dias a uma data AAAA-MM-DD sem depender do fuso. */
export function somarDias(data: string, dias: number): string {
  const d = new Date(`${data}T12:00:00`)
  d.setDate(d.getDate() + dias)
  return paraTexto(d)
}
/** "16/10" */
export const diaEMes = (data: string) => new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
export const DIAS_CURTOS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
export function dataLegivel(data: string): string {
  return new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
}
