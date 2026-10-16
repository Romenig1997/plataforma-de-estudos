import { Link } from 'react-router-dom'

import type { DisciplinaDashboard } from '../dashboard'
import { contar, formatarPercentual, nivelDeAcertos } from '../desempenho'
import BarraDeDesempenho from './BarraDeDesempenho'

type Props = {
  disciplina: DisciplinaDashboard
  editalId: number
  /** Marcada pela analise quando os acertos estao abaixo das demais disciplinas. */
  abaixoDasDemais?: boolean
}

/** Disciplina com duas medidas separadas: quanto foi estudado e quanto se acerta. */
function CartaoDeDisciplina({ disciplina, editalId, abaixoDasDemais = false }: Props) {
  const total = disciplina.topicos.length
  const feitos = disciplina.topicos.filter(t => t.concluido).length
  const temRespostas = disciplina.questoes > 0 && disciplina.desempenho !== null
  const nivel = temRespostas ? nivelDeAcertos(disciplina.desempenho ?? 0) : null

  return (
    <li className={abaixoDasDemais ? 'cartao-disciplina cartao-disciplina--alerta' : 'cartao-disciplina'}>
      <header className="cartao-disciplina__cabecalho">
        <h3>{disciplina.nome}</h3>
        {abaixoDasDemais && <span className="selo selo--alerta">Abaixo das demais</span>}
        <Link className="cartao-disciplina__praticar" to={`/questoes?curso=${editalId}&disciplina=${disciplina.id}`}
          aria-label={`Praticar ${disciplina.nome}`}>Praticar</Link>
      </header>
      <BarraDeDesempenho
        rotulo="Estudo"
        valor={total ? (100 * feitos) / total : null}
        texto={`${feitos} de ${contar(total, 'tópico', 'tópicos')}`}
      />
      <BarraDeDesempenho
        rotulo="Acertos"
        valor={temRespostas ? disciplina.desempenho : null}
        nivel={nivel?.classe}
        texto={temRespostas && nivel
          ? `${formatarPercentual(disciplina.desempenho ?? 0)} · ${disciplina.acertos} de ${contar(disciplina.questoes, 'questão', 'questões')} · ${nivel.rotulo}`
          : 'Sem respostas ainda'}
      />
    </li>
  )
}

export default CartaoDeDisciplina
