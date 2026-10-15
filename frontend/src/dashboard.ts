import { requisitar, requisitarOpcional } from './api'
import type { Atividade } from './cronograma'

export type Registro = { concluido: boolean }
export type Topico = Registro & { id: number; nome: string; pagina: number; questoes: number; acertos: number }
export type DisciplinaDashboard = { id: number; nome: string; questoes: number; acertos: number; desempenho: number | null; topicos: Topico[] }
export type Dashboard = {
  editalId: number
  editalTitulo: string
  totalTopicos: number
  topicosConcluidos: number
  progresso: number
  disciplinas: DisciplinaDashboard[]
  proximasAtividades: Atividade[]
  cronogramaDesatualizado: boolean
}

function agoraLocal(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/** `null` quando o aluno ainda nao salvou um plano (204). */
export const buscarDashboard = (token: string) =>
  requisitarOpcional<Dashboard>(`/api/dashboard?agora=${encodeURIComponent(agoraLocal())}`, token)

/**
 * Marca ou desmarca a conclusao de um topico final. O backend so aceita
 * topicos do edital do plano ativo - a mesma fonte do progresso dos cursos.
 */
export async function salvarRegistro(token: string, conteudoId: number, dados: Registro): Promise<void> {
  await requisitar(`/api/dashboard/registros/${conteudoId}`, token, { metodo: 'PUT', json: dados })
}
