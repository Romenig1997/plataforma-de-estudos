import { useRef, useState } from 'react'
import { DIAS, DIAS_CURTOS, PERIODOS, minutosDisponiveis, planejarSemana, type Disponibilidade, type Janela } from '../cronograma'
import { formatarTempo } from '../planner'
import Botao from './Botao'
import { SlidersHorizontalIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

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

  const opcao = 'inline-flex h-9 items-center justify-center rounded-full border bg-card px-4 text-sm font-medium transition-colors outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground'
  const pergunta = 'mb-3 flex items-center gap-2 font-semibold'
  const numero = <T extends string>(n: T) => <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground" aria-hidden="true">{n}</span>
  const campoHora = 'h-10 w-32 rounded-md border border-input bg-card px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40'

  return (
    <Card className="gap-0 py-0">
    <form onSubmit={e => { e.preventDefault(); onSalvar(horarios) }} noValidate>
      <fieldset className="flex min-w-0 flex-col disabled:opacity-70" disabled={salvando}>
        <legend className="sr-only">Marcações da semana</legend>
        <header className="flex flex-col gap-1 border-b p-6 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="titulo-horarios" className="text-lg font-semibold">Marcações da semana</h2>
          <p className="text-sm text-muted-foreground">Meta do planner: <strong className="text-foreground">{meta} por semana</strong></p>
        </header>

        <div className="flex flex-col gap-8 p-6">
        <fieldset className="min-w-0">
          <legend className={pergunta}>{numero('1')}Quais dias da semana você quer estudar?</legend>
          <div className="flex flex-wrap gap-2">
            {DIAS_CURTOS.map((curto, i) => <button key={curto} type="button" className={cn(opcao, 'w-12 px-0')} aria-label={DIAS[i]}
              aria-pressed={dias.includes(i + 1)} onClick={() => alternarDia(i + 1)}>{curto}</button>)}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{dias.length === 1 ? '1 dia marcado' : `${dias.length} dias marcados`}</p>
        </fieldset>

        <fieldset className="min-w-0">
          <legend className={pergunta}>{numero('2')}Em quais horários você pode estudar?</legend>
          {mesmo ? <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Período do dia">
              {PERIODOS.map(p => <button key={p.nome} type="button" className={opcao} aria-pressed={periodo === p.nome}
                onClick={() => setHorario({ inicio: p.inicio, fim: p.fim })}>{p.nome}</button>)}
              <button type="button" className={opcao} aria-pressed={periodo === 'Personalizado'} onClick={() => campoInicio.current?.focus()}>Personalizado</button>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-2">De <input ref={campoInicio} className={campoHora} type="time" aria-label="Início do horário de estudo" value={horario.inicio} onChange={e => setHorario(h => ({ ...h, inicio: e.target.value }))} /></label>
              <label className="flex items-center gap-2">até <input className={campoHora} type="time" aria-label="Fim do horário de estudo" value={horario.fim} onChange={e => setHorario(h => ({ ...h, fim: e.target.value }))} /></label>
            </div>
            <p className="text-xs text-muted-foreground">Vale para todos os dias marcados. <Button type="button" variant="link" size="sm" className="h-auto text-xs" onClick={() => usarHorarioPorDia(true)}>Usar horário diferente em cada dia</Button></p>
          </div> : <div className="flex flex-col gap-3">
            {!ordenados.length && <p className="text-sm text-muted-foreground">Marque os dias acima para definir o horário de cada um.</p>}
            <ul className="flex flex-col divide-y rounded-lg border">
              {ordenados.map(d => {
                const atual = porDia[d] ?? horario
                return <li key={d} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                  <span className="w-28 font-medium">{DIAS[d - 1]}</span>
                  <label className="flex items-center gap-2">De <input className={campoHora} type="time" aria-label={`Início — ${DIAS[d - 1]}`} value={atual.inicio} onChange={e => editarDia(d, 'inicio', e.target.value)} /></label>
                  <label className="flex items-center gap-2">até <input className={campoHora} type="time" aria-label={`Fim — ${DIAS[d - 1]}`} value={atual.fim} onChange={e => editarDia(d, 'fim', e.target.value)} /></label>
                </li>
              })}
            </ul>
            <p><Button type="button" variant="link" size="sm" className="h-auto text-xs" onClick={() => usarHorarioPorDia(false)}>Usar o mesmo horário em todos os dias</Button></p>
          </div>}
        </fieldset>

        <fieldset className="min-w-0">
          <legend className={pergunta}>{numero('3')}Quer que a plataforma planeje automaticamente pela sua meta?</legend>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors has-checked:border-primary has-checked:bg-accent">
              <input className="mt-0.5 size-4 accent-primary" type="radio" name="marcacoes-modo" checked={automatico} onChange={() => setAutomatico(true)} />
              <span className="flex flex-col gap-1 text-sm font-medium">Sim, dividir as {meta} entre os dias marcados<small className="text-xs font-normal text-muted-foreground">Blocos a partir do início do horário, arredondados em 30 min.</small></span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors has-checked:border-primary has-checked:bg-accent">
              <input className="mt-0.5 size-4 accent-primary" type="radio" name="marcacoes-modo" checked={!automatico} onChange={() => setAutomatico(false)} />
              <span className="text-sm font-medium">Não, usar todo o horário livre que informei</span>
            </label>
          </div>
        </fieldset>

        <section className="flex flex-col gap-3" aria-labelledby="titulo-previa">
          <h3 id="titulo-previa" className="font-semibold">Prévia da semana</h3>
          <ul className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {DIAS_CURTOS.map((curto, i) => {
              const doDia = horarios.find(h => h.diaSemana === i + 1)
              return <li key={curto} className={cn('flex min-w-0 flex-col items-center gap-1 rounded-lg border px-1 py-2.5 text-center', doDia ? 'border-primary/30 bg-accent text-accent-foreground' : 'border-dashed text-muted-foreground')} aria-label={`${DIAS[i]}: ${doDia ? `${doDia.inicio} às ${doDia.fim}` : 'livre'}`}>
                <strong className="text-xs sm:text-sm" aria-hidden="true">{curto}</strong>
                <span className="text-[0.65rem] leading-tight tabular-nums sm:text-xs" aria-hidden="true">{doDia ? <>{doDia.inicio}<br />{doDia.fim}</> : 'Livre'}</span>
              </li>
            })}
          </ul>
          {resumo && <p className={cn('rounded-lg px-4 py-3 text-sm', resumo.tipo === 'ok' ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning')} role="status">{resumo.texto}</p>}
        </section>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t p-6 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="link" onClick={() => onAjustarManualmente(horarios)}><SlidersHorizontalIcon aria-hidden="true" />Ajustar manualmente</Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {onCancelar && <Botao type="button" variante="secundario" onClick={onCancelar}>Cancelar</Botao>}
            <Botao type="submit" carregando={salvando}>{salvando ? 'Gerando e salvando...' : 'Gerar e salvar cronograma'}</Botao>
          </div>
        </div>
      </fieldset>
    </form>
    </Card>
  )
}

export default MarcacoesDaSemana
