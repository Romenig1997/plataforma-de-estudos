import type { ReactNode } from 'react'

type Props = {
  id?: string
  numero: number
  titulo: string
  concluida: boolean
  /** Sem esta funcao a aula nao pode ser marcada (curso fora do plano ativo). */
  onAlternarConclusao?: () => void
  salvando?: boolean
  atual?: boolean
  onAbrirPdf?: () => void
  recursos?: ReactNode
}

/**
 * Linha reutilizável de uma aula. O layout e a hierarquia visual ficam
 * centralizados aqui para que qualquer lista de aulas tenha o mesmo padrão.
 */
export default function AulaRow({ id, numero, titulo, concluida, onAlternarConclusao, salvando = false, atual = false, onAbrirPdf, recursos }: Props) {
  // Topicos de edital costumam ja vir numerados ("11. Coesao"): nao repete.
  const rotulo = /^\d+(\.\d+)*[.)\s]/.test(titulo) ? titulo : `${numero} - ${titulo}`
  return <li id={id} className={`aula-row${atual ? ' aula-row--atual' : ''}${concluida ? ' aula-row--concluida' : ''}`} aria-current={atual ? 'step' : undefined}>
    <div className="aula-row__top">
      {onAlternarConclusao
        ? <input
          className="checkbox-concluido"
          type="checkbox"
          checked={concluida}
          disabled={salvando}
          onChange={onAlternarConclusao}
          aria-label={`Concluir aula ${rotulo}`}
        />
        : <span className={`aula-row__marcador${concluida ? ' aula-row__marcador--concluido' : ''}`} aria-hidden="true" />}
      {onAbrirPdf
        ? <button type="button" className="aula-titulo aula-titulo--link" onClick={onAbrirPdf}>{rotulo}</button>
        : <span className="aula-titulo">{rotulo}</span>}
    </div>
    {recursos && <div className="aula-meta">
      <div className="aula-meta__recursos" role="group" aria-label={`Recursos da aula ${titulo}`}>{recursos}</div>
    </div>}
  </li>
}
