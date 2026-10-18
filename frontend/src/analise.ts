import { requisitarOpcional } from './api'
import { porCurso } from './cursos'

export type Analise = {
  editalId: number
  editalTitulo: string
  analise: {
    desempenhoGeral: number | null
    comparacaoDisponivel: boolean
    disciplinas: { id: number; nome: string; questoes: number; acertos: number; desempenho: number | null; abaixoDosDemais: boolean }[]
    /** Somente topicos com respostas. */
    topicos: { id: number; nome: string; disciplinaId: number; disciplina: string; questoes: number; acertos: number; desempenho: number; abaixoDosDemais: boolean }[]
    /** Topicos onde focar, do mais urgente ao menos (no maximo tres). */
    recomendacoes: { conteudoId: number; conteudo: string; disciplinaId: number; disciplina: string; mensagem: string }[]
  }
}

/** `null` quando o aluno ainda nao salvou um plano (204). */
export const buscarAnalise = (token: string, editalId?: number | null) =>
  requisitarOpcional<Analise>(porCurso('/api/analise', editalId), token)
