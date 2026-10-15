import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listarInscricoes } from './cursos'
import { useRecurso } from './useRecurso'

/**
 * Curso escolhido nas telas por curso (Desempenho, Analise, Questoes). Fica
 * no endereco (`?curso=`) para sobreviver ao recarregar e poder ser
 * compartilhado; sem parametro, a API usa o curso em foco.
 */
export function useCursoSelecionado(token: string, onEncerrarSessao: (motivo?: string) => void) {
  const [parametros, setParametros] = useSearchParams()
  const editalId = Number(parametros.get('curso')) || null
  const carregar = useCallback(() => listarInscricoes(token), [token])
  const { dados } = useRecurso(carregar, onEncerrarSessao, 'Não foi possível carregar seus cursos.')
  const inscricoes = Array.isArray(dados) ? dados : []

  function escolher(id: number) {
    const novos = new URLSearchParams(parametros)
    novos.set('curso', String(id))
    novos.delete('pagina')
    novos.delete('disciplina')
    setParametros(novos)
  }

  return { editalId, inscricoes, escolher }
}
