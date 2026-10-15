import { requisitar, requisitarOpcional } from './api'
import { porCurso } from './cursos'
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

/** Painel do curso informado (ou do curso em foco); `null` sem inscricao (204). */
export const buscarDashboard = (token: string, editalId?: number | null) =>
  requisitarOpcional<Dashboard>(porCurso(`/api/dashboard?agora=${encodeURIComponent(agoraLocal())}`, editalId), token)

/**
 * Marca ou desmarca a conclusao de um topico final de qualquer curso em que
 * o aluno esteja inscrito - a mesma fonte do progresso dos cursos.
 */
export async function salvarRegistro(token: string, conteudoId: number, dados: Registro): Promise<void> {
  await requisitar(`/api/dashboard/registros/${conteudoId}`, token, { metodo: 'PUT', json: dados })
}
