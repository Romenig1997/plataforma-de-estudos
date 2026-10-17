import { useRef, useState } from 'react'
import { DIAS, DIAS_CURTOS, PERIODOS, minutosDisponiveis, planejarSemana, type Disponibilidade, type Janela } from '../cronograma'
import { formatarTempo } from '../planner'
import Botao from './Botao'

type Props = {
  /** Periodos salvos (um por dia); vazio abre com os padroes. */
  janelas: Janela[]
  metaEmMinutos: number
  salvando: boolean
  onSalvar: (horarios: Disponibilidade[]) => void
  onAjustarManualmente: (horarios: Disponibilidade[]) => void
  onCancelar?: () => void
}

type Horario = { inicio: string; fim: string }
const DIAS_UTEIS = [1, 2, 3, 4, 5]
const PADRAO: Horario = { inicio: PERIODOS[0].inicio, fim: PERIODOS[0].fim }

/** Estado inicial: um so horario quando todos os dias salvos usam o mesmo. */
function estadoInicial(janelas: Janela[]) {
  if (!janelas.length) return { dias: DIAS_UTEIS, mesmo: true, horario: PADRAO, porDia: {}, automatico: true }
  const [primeira] = janelas
  const mesmo = janelas.every(j => j.inicio === primeira.inicio && j.fim === primeira.fim)
  return {
    dias: janelas.map(j => j.diaSemana),
    mesmo,
    horario: { inicio: primeira.inicio, fim: primeira.fim },
    porDia: Object.fromEntries(janelas.map(j => [j.diaSemana, { inicio: j.inicio, fim: j.fim }])) as Record<number, Horario>,
    // Horarios ja salvos sao o resultado final: reabrir sem redistribuir.
    automatico: false,
  }
}

/**
 * Marcacoes da semana: dias, horario livre e planejamento automatico pela meta.
 * Gera a mesma lista de horarios da grade manual, que continua disponivel.
 */
function MarcacoesDaSemana({ janelas, metaEmMinutos, salvando, onSalvar, onAjustarManualmente, onCancelar }: Props) {
  const [inicial] = useState(() => estadoInicial(janelas))
  const [dias, setDias] = useState<number[]>(inicial.dias)
  const [mesmo, setMesmo] = useState(inicial.mesmo)
  const [horario, setHorario] = useState<Horario>(inicial.horario)
  const [porDia, setPorDia] = useState<Record<number, Horario>>(inicial.porDia)
  const [automatico, setAutomatico] = useState(inicial.automatico)
  const campoInicio = useRef<HTMLInputElement>(null)

  const periodo = PERIODOS.find(p => p.inicio === horario.inicio && p.fim === horario.fim)?.nome ?? 'Personalizado'
  const ordenados = [...dias].sort((a, b) => a - b)
  const horarios = planejarSemana(ordenados.map(d => ({ diaSemana: d, ...(mesmo ? horario : porDia[d] ?? horario) })), metaEmMinutos, automatico)
  const total = minutosDisponiveis(horarios)
  const meta = formatarTempo(metaEmMinutos)

  const alternarDia = (dia: number) => setDias(atual => (atual.includes(dia) ? atual.filter(d => d !== dia) : [...atual, dia]))
  const editarDia = (dia: number, campo: keyof Horario, valor: string) =>
    setPorDia(atual => ({ ...atual, [dia]: { ...(atual[dia] ?? horario), [campo]: valor } }))
  function usarHorarioPorDia(porDiaAtivo: boolean) {
    // Ao separar por dia, cada dia comeca com o horario comum.
    if (porDiaAtivo) setPorDia(Object.fromEntries(ordenados.map(d => [d, porDia[d] ?? horario])))
    setMesmo(!porDiaAtivo)
  }

  let resumo: { tipo: 'ok' | 'atencao'; texto: string } | null = null
  if (!dias.length) resumo = { tipo: 'atencao', texto: 'Marque pelo menos um dia para estudar.' }
  else if (total < metaEmMinutos) resumo = { tipo: 'atencao', texto: `Faltam ${formatarTempo(metaEmMinutos - total)} para a meta de ${meta}. Marque mais dias ou amplie o horário.` }
  else if (total > metaEmMinutos) resumo = { tipo: 'atencao', texto: `Os horários somam ${formatarTempo(total)} para uma meta de ${meta}: as sessões param ao completar a meta.` }
  else if (metaEmMinutos > 0) resumo = { tipo: 'ok', texto: `Total de ${formatarTempo(total)} na semana, igual à sua meta.` }

  return (
    <form className="marcacoes" onSubmit={e => { e.preventDefault(); onSalvar(horarios) }} noValidate>
      <fieldset className="marcacoes__campos" disabled={salvando}>
        <legend className="visualmente-oculto">Marcações da semana</legend>
        <header className="marcacoes__cabecalho">
          <h2 id="titulo-horarios">Marcações da semana</h2>
          <p>Meta do planner: <strong>{meta} por semana</strong></p>
        </header>

        <fieldset className="marcacoes__etapa">
          <legend className="marcacoes__pergunta"><span className="marcacoes__numero" aria-hidden="true">1</span>Quais dias da semana você quer estudar?</legend>
          <div className="marcacoes__opcoes">
            {DIAS_CURTOS.map((curto, i) => <button key={curto} type="button" className="marcacoes__opcao" aria-label={DIAS[i]}
              aria-pressed={dias.includes(i + 1)} onClick={() => alternarDia(i + 1)}>{curto}</button>)}
          </div>
          <p className="marcacoes__ajuda">{dias.length === 1 ? '1 dia marcado' : `${dias.length} dias marcados`}</p>
        </fieldset>

        <fieldset className="marcacoes__etapa">
          <legend className="marcacoes__pergunta"><span className="marcacoes__numero" aria-hidden="true">2</span>Em quais horários você pode estudar?</legend>
          {mesmo ? <>
            <div className="marcacoes__opcoes" role="group" aria-label="Período do dia">
              {PERIODOS.map(p => <button key={p.nome} type="button" className="marcacoes__opcao" aria-pressed={periodo === p.nome}
                onClick={() => setHorario({ inicio: p.inicio, fim: p.fim })}>{p.nome}</button>)}
              <button type="button" className="marcacoes__opcao" aria-pressed={periodo === 'Personalizado'} onClick={() => campoInicio.current?.focus()}>Personalizado</button>
            </div>
            <div className="marcacoes__horario">
              <label>De <input ref={campoInicio} type="time" aria-label="Início do horário de estudo" value={horario.inicio} onChange={e => setHorario(h => ({ ...h, inicio: e.target.value }))} /></label>
              <label>até <input type="time" aria-label="Fim do horário de estudo" value={horario.fim} onChange={e => setHorario(h => ({ ...h, fim: e.target.value }))} /></label>
            </div>
            <p className="marcacoes__ajuda">Vale para todos os dias marcados. <button type="button" className="curso-link" onClick={() => usarHorarioPorDia(true)}>Usar horário diferente em cada dia</button></p>
          </> : <>
            {!ordenados.length && <p className="marcacoes__ajuda">Marque os dias acima para definir o horário de cada um.</p>}
            <ul className="marcacoes__por-dia">
              {ordenados.map(d => {
                const atual = porDia[d] ?? horario
                return <li key={d}>
                  <span>{DIAS[d - 1]}</span>
                  <label>De <input type="time" aria-label={`Início — ${DIAS[d - 1]}`} value={atual.inicio} onChange={e => editarDia(d, 'inicio', e.target.value)} /></label>
                  <label>até <input type="time" aria-label={`Fim — ${DIAS[d - 1]}`} value={atual.fim} onChange={e => editarDia(d, 'fim', e.target.value)} /></label>
                </li>
              })}
            </ul>
            <p className="marcacoes__ajuda"><button type="button" className="curso-link" onClick={() => usarHorarioPorDia(false)}>Usar o mesmo horário em todos os dias</button></p>
          </>}
        </fieldset>

        <fieldset className="marcacoes__etapa">
          <legend className="marcacoes__pergunta"><span className="marcacoes__numero" aria-hidden="true">3</span>Quer que a plataforma planeje automaticamente pela sua meta?</legend>
          <label className="marcacoes__escolha">
            <input type="radio" name="marcacoes-modo" checked={automatico} onChange={() => setAutomatico(true)} />
            <span>Sim, dividir as {meta} entre os dias marcados<small>Blocos a partir do início do horário, arredondados em 30 min.</small></span>
          </label>
          <label className="marcacoes__escolha">
            <input type="radio" name="marcacoes-modo" checked={!automatico} onChange={() => setAutomatico(false)} />
            <span>Não, usar todo o horário livre que informei</span>
          </label>
        </fieldset>

        <section className="marcacoes__etapa" aria-labelledby="titulo-previa">
          <h3 id="titulo-previa" className="marcacoes__pergunta">Prévia da semana</h3>
          <ul className="marcacoes__previa">
            {DIAS_CURTOS.map((curto, i) => {
              const doDia = horarios.find(h => h.diaSemana === i + 1)
              return <li key={curto} className={doDia ? 'marcacoes__dia marcacoes__dia--estudo' : 'marcacoes__dia'} aria-label={`${DIAS[i]}: ${doDia ? `${doDia.inicio} às ${doDia.fim}` : 'livre'}`}>
                <strong aria-hidden="true">{curto}</strong>
                <span aria-hidden="true">{doDia ? <>{doDia.inicio}<br />{doDia.fim}</> : 'Livre'}</span>
              </li>
            })}
          </ul>
          {resumo && <p className={`marcacoes__resumo marcacoes__resumo--${resumo.tipo}`} role="status">{resumo.texto}</p>}
        </section>

        <div className="marcacoes__acoes">
          <button type="button" className="curso-link" onClick={() => onAjustarManualmente(horarios)}>Ajustar manualmente</button>
          <div className="acoes acoes--em-linha">
            {onCancelar && <Botao type="button" variante="secundario" onClick={onCancelar}>Cancelar</Botao>}
            <Botao type="submit" carregando={salvando}>{salvando ? 'Gerando e salvando...' : 'Gerar e salvar cronograma'}</Botao>
          </div>
        </div>
      </fieldset>
    </form>
  )
}

export default MarcacoesDaSemana
