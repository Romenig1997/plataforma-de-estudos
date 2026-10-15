import type { Inscricao } from '../cursos'

type Props = {
  inscricoes: Inscricao[]
  /** Curso exibido agora (o pedido no endereco ou o que a API devolveu). */
  editalAtual: number | null
  onEscolher: (editalId: number) => void
}

/** Seletor de curso para quem esta inscrito em mais de um. */
export default function SeletorDeCurso({ inscricoes, editalAtual, onEscolher }: Props) {
  if (inscricoes.length < 2) return null
  const valor = editalAtual ?? inscricoes.find(i => i.emFoco)?.editalId ?? inscricoes[0].editalId
  return (
    <div className="campo seletor-curso">
      <label htmlFor="seletor-curso">Curso</label>
      <select id="seletor-curso" value={valor} onChange={evento => onEscolher(Number(evento.target.value))}>
        {inscricoes.map(i => <option key={i.editalId} value={i.editalId}>{i.titulo}{i.emFoco ? ' (em foco)' : ''}</option>)}
      </select>
    </div>
  )
}
