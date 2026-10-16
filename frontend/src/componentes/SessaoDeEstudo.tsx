import { Link } from 'react-router-dom'

import type { Atividade } from '../cronograma'

type Props = {
  atividade: Atividade
  /** Titulo do curso, mostrado apenas quando a agenda junta varios cursos. */
  curso?: string
  /** Marca ou desmarca o topico como concluido (mesmo registro do curso). */
  onConcluir?: (atividade: Atividade, concluido: boolean) => void
  salvando?: boolean
}

/** Uma sessao da agenda: horario, disciplina, topico, conclusao e atalho para estudar. */
function SessaoDeEstudo({ atividade, curso, onConcluir, salvando = false }: Props) {
  const feita = Boolean(atividade.concluido)
  const idDaCaixa = `sessao-${atividade.id}-feita`
  return (
    <li className={feita ? 'sessao-estudo sessao-estudo--feita' : 'sessao-estudo'}>
      <p className="sessao-estudo__horario">{atividade.inicio.slice(0, 5)}–{atividade.fim.slice(0, 5)}</p>
      <div className="sessao-estudo__corpo">
        <p className="sessao-estudo__disciplina"><strong>{atividade.disciplina}</strong></p>
        {curso && <p className="cronograma-curso">{curso}</p>}
        <p>{atividade.conteudo} <span className="sessao-estudo__pagina">(pág. {atividade.pagina})</span></p>
        <div className="sessao-estudo__acoes">
          {onConcluir && <label className="sessao-estudo__feita" htmlFor={idDaCaixa}>
            <input id={idDaCaixa} type="checkbox" checked={feita} disabled={salvando}
              aria-label={`Concluir ${atividade.conteudo}`}
              onChange={evento => onConcluir(atividade, evento.target.checked)} />
            <span aria-hidden="true">{feita ? 'Concluída' : 'Marcar como feita'}</span>
          </label>}
          {atividade.editalId !== undefined && <Link className="curso-link" to={`/curso/${atividade.editalId}?aula=${atividade.conteudoId}`}
            aria-label={`Estudar ${atividade.conteudo}`}>Estudar</Link>}
        </div>
      </div>
    </li>
  )
}

export default SessaoDeEstudo
