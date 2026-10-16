import { useState } from 'react'

import { DIAS, DIAS_CURTOS, diaEMes, somarDias, type Atividade } from '../cronograma'
import SessaoDeEstudo from './SessaoDeEstudo'

type Props = {
  semanaInicio: string
  atividades: Atividade[]
  /** AAAA-MM-DD; destacado na faixa e aberto por padrao quando esta na semana. */
  hoje: string
  /** Titulo do curso de cada sessao quando a agenda junta varios cursos. */
  cursoDe?: (atividade: Atividade) => string | undefined
  onConcluir?: (atividade: Atividade, concluido: boolean) => void
  /** Topico com conclusao em andamento: suas caixas ficam bloqueadas. */
  salvandoConteudo?: number | null
}

/**
 * Agenda da semana: faixa Seg-Dom com o total de sessoes de cada dia e a
 * lista do dia escolhido. Abre em hoje; fora da semana, no primeiro dia com estudo.
 */
function AgendaDaSemana({ semanaInicio, atividades, hoje, cursoDe, onConcluir, salvandoConteudo = null }: Props) {
  const dias = DIAS.map((_, i) => somarDias(semanaInicio, i))
  const doDia = (data: string) => atividades.filter(a => a.data === data).sort((a, b) => a.inicio.localeCompare(b.inicio))
  const inicial = dias.includes(hoje) ? hoje : (dias.find(d => doDia(d).length) ?? dias[0])
  const [escolhido, setEscolhido] = useState(inicial)
  const dia = dias.includes(escolhido) ? escolhido : inicial
  const indice = dias.indexOf(dia)
  const sessoes = doDia(dia)

  return (
    <section className="agenda-semana" aria-labelledby="agenda-dia-titulo">
      <div className="agenda-semana__dias" role="group" aria-label="Dias da semana">
        {dias.map((data, i) => {
          const total = doDia(data).length
          const feitas = doDia(data).filter(a => a.concluido).length
          const classes = ['agenda-dia', data === dia && 'agenda-dia--ativo', data === hoje && 'agenda-dia--hoje', data < hoje && 'agenda-dia--passado']
          return (
            <button
              key={data}
              type="button"
              className={classes.filter(Boolean).join(' ')}
              aria-pressed={data === dia}
              aria-label={`${DIAS[i]}, ${diaEMes(data)}${data === hoje ? ' (hoje)' : ''}: ${total} ${total === 1 ? 'sessão' : 'sessões'}${total ? `, ${feitas} ${feitas === 1 ? 'feita' : 'feitas'}` : ''}`}
              onClick={() => setEscolhido(data)}
            >
              <span className="agenda-dia__nome">{DIAS_CURTOS[i]}</span>
              <span className="agenda-dia__data">{diaEMes(data)}</span>
              {/* No celular so o numero aparece; o rotulo completo fica no aria-label. */}
              <span className="agenda-dia__total" aria-hidden="true">
                <span className="agenda-dia__numero">{total ? `${feitas}/${total}` : '–'}</span>
                <span className="agenda-dia__rotulo">{total ? ' feitas' : ' livre'}</span>
              </span>
            </button>
          )
        })}
      </div>

      <h2 id="agenda-dia-titulo" className="agenda-semana__titulo">
        {dia === hoje && <span className="agenda-semana__hoje">Hoje · </span>}
        {DIAS[indice]}, {diaEMes(dia)}
      </h2>
      {sessoes.length
        ? <ol className="cronograma-atividades">{sessoes.map(a => <SessaoDeEstudo key={a.id} atividade={a} curso={cursoDe?.(a)} onConcluir={onConcluir} salvando={salvandoConteudo === a.conteudoId} />)}</ol>
        : <p className="agenda-semana__livre">Nenhuma sessão de estudo neste dia.</p>}
    </section>
  )
}

export default AgendaDaSemana
