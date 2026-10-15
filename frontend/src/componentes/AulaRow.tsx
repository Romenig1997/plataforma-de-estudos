import type { ReactNode } from 'react'

type Props = {
  numero: number
  titulo: string
  concluida: boolean
  onAlternarConclusao: () => void
  onAbrirPdf?: () => void
  recursos: ReactNode
}

/**
 * Linha reutilizável de uma aula. O layout e a hierarquia visual ficam
 * centralizados aqui para que qualquer lista de aulas tenha o mesmo padrão.
 */
export default function AulaRow({ numero, titulo, concluida, onAlternarConclusao, onAbrirPdf, recursos }: Props) {
  return <li className="aula-row">
    <div className="aula-row__top">
      <input
        className="checkbox-concluido"
        type="checkbox"
        checked={concluida}
        onChange={onAlternarConclusao}
        aria-label={`Concluir aula ${numero} - ${titulo}`}
      />
      {onAbrirPdf
        ? <button type="button" className="aula-titulo aula-titulo--link" title={`Abrir PDF: ${numero} - ${titulo}`} onClick={onAbrirPdf}>{numero} - {titulo}</button>
        : <span className="aula-titulo" title={`${numero} - ${titulo}`}>{numero} - {titulo}</span>}
    </div>
    <div className="aula-meta">
      <div className="aula-meta__recursos" aria-label={`Recursos da aula ${titulo}`}>{recursos}</div>
    </div>
  </li>
}
