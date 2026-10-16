import type { Atividade } from '../cronograma'

type Props = {
  atividade: Atividade
  /** Titulo do curso, mostrado apenas quando a agenda junta varios cursos. */
  curso?: string
}

/** Uma sessao da agenda: horario, disciplina, topico e pagina do edital. */
function SessaoDeEstudo({ atividade, curso }: Props) {
  return (
    <li className="sessao-estudo">
      <p className="sessao-estudo__horario">{atividade.inicio.slice(0, 5)}–{atividade.fim.slice(0, 5)}</p>
      <div className="sessao-estudo__corpo">
        <p className="sessao-estudo__disciplina"><strong>{atividade.disciplina}</strong></p>
        {curso && <p className="cronograma-curso">{curso}</p>}
        <p>{atividade.conteudo} <span className="sessao-estudo__pagina">(pág. {atividade.pagina})</span></p>
      </div>
    </li>
  )
}

export default SessaoDeEstudo
