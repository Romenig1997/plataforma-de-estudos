import { requisitarOpcional } from './api'
import { porCurso } from './cursos'

export type Analise = {
  editalId: number
  editalTitulo: string
  analise: {
    desempenhoGeral: number | null
    comparacaoDisponivel: boolean
    disciplinas: { id: number; nome: string; questoes: number; acertos: number; desempenho: number | null; abaixoDosDemais: boolean }[]
    recomendacoes: { disciplinaId: number; disciplina: string; mensagem: string }[]
  }
}

/** `null` quando o aluno ainda nao salvou um plano (204). */
export const buscarAnalise = (token: string, editalId?: number | null) =>
  requisitarOpcional<Analise>(porCurso('/api/analise', editalId), token)
