import { useState } from 'react'

import { DIAS, DIAS_CURTOS, diaEMes, somarDias, type Atividade, type Feriado } from '../cronograma'
import SessaoDeEstudo from './SessaoDeEstudo'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

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
  /** Feriados nacionais da semana (HU17): o dia e marcado e fica sem sessoes. */
  feriados?: Feriado[]
}

/**
 * Agenda da semana: faixa Seg-Dom com o total de sessoes de cada dia e a
 * lista do dia escolhido. Abre em hoje; fora da semana, no primeiro dia com estudo.
 */
function AgendaDaSemana({ semanaInicio, atividades, hoje, cursoDe, onConcluir, salvandoConteudo = null, feriados = [] }: Props) {
  const feriadoDe = (data: string) => feriados.find(f => f.data === data)
  const dias = DIAS.map((_, i) => somarDias(semanaInicio, i))
  const doDia = (data: string) => atividades.filter(a => a.data === data).sort((a, b) => a.inicio.localeCompare(b.inicio))
  const inicial = dias.includes(hoje) ? hoje : (dias.find(d => doDia(d).length) ?? dias[0])
  const [escolhido, setEscolhido] = useState(inicial)
  const dia = dias.includes(escolhido) ? escolhido : inicial
  const indice = dias.indexOf(dia)
  const sessoes = doDia(dia)

  return (
    <Card className="gap-5" role="region" aria-labelledby="agenda-dia-titulo">
      <CardContent className="flex flex-col gap-5">
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2" role="group" aria-label="Dias da semana">
          {dias.map((data, i) => {
            const total = doDia(data).length
            const feitas = doDia(data).filter(a => a.concluido).length
            const ativo = data === dia
            return (
              <button
                key={data}
                type="button"
                className={cn(
                  'relative flex min-w-0 flex-col items-center gap-0.5 rounded-lg border px-1 py-2.5 text-center transition-colors outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:py-3',
                  ativo ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-card',
                  // Dias que ja passaram: fundo apagado, sem perder o contraste do texto.
                  !ativo && data < hoje && 'bg-muted',
                )}
                aria-pressed={ativo}
                data-feriado={feriadoDe(data) ? 'true' : undefined}
                aria-label={`${DIAS[i]}, ${diaEMes(data)}${data === hoje ? ' (hoje)' : ''}${feriadoDe(data) ? `, feriado: ${feriadoDe(data)?.nome}` : ''}: ${total} ${total === 1 ? 'sessão' : 'sessões'}${total ? `, ${feitas} ${feitas === 1 ? 'feita' : 'feitas'}` : ''}`}
                onClick={() => setEscolhido(data)}
              >
                {data === hoje && <span className={cn('absolute top-1.5 right-1.5 size-1.5 rounded-full', ativo ? 'bg-brand-gold' : 'bg-brand-red')} aria-hidden="true" />}
                <span className="text-xs font-semibold sm:text-sm">{DIAS_CURTOS[i]}</span>
                {feriadoDe(data) && <span className={cn('text-[0.6rem] font-semibold uppercase sm:text-[0.65rem]', ativo ? 'text-brand-gold' : 'text-warning')} aria-hidden="true">Feriado</span>}
                <span className={cn('text-[0.65rem] sm:text-xs', ativo ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{diaEMes(data)}</span>
                {/* No celular so o numero aparece; o rotulo completo fica no aria-label. */}
                <span className={cn('mt-1 text-[0.65rem] font-medium tabular-nums sm:text-xs', ativo ? 'text-primary-foreground/90' : 'text-muted-foreground')} aria-hidden="true">
                  <span>{total ? `${feitas}/${total}` : '–'}</span>
                  <span className="hidden md:inline">{total ? ' feitas' : ' livre'}</span>
                </span>
              </button>
            )
          })}
        </div>

        <h2 id="agenda-dia-titulo" className="flex items-center gap-2 text-lg font-semibold">
          {dia === hoje && <Badge variant="destructive" aria-hidden="true">Hoje</Badge>}
          {dia === hoje && <span className="sr-only">Hoje · </span>}
          {DIAS[indice]}, {diaEMes(dia)}
          {feriadoDe(dia) && <Badge variant="warning">Feriado: {feriadoDe(dia)?.nome}</Badge>}
        </h2>
        {sessoes.length
          ? <ol className="flex flex-col gap-3">{sessoes.map(a => <SessaoDeEstudo key={a.id} atividade={a} curso={cursoDe?.(a)} onConcluir={onConcluir} salvando={salvandoConteudo === a.conteudoId} />)}</ol>
          : <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">{feriadoDe(dia) ? `Feriado (${feriadoDe(dia)?.nome}): nenhuma sessão planejada.` : 'Nenhuma sessão de estudo neste dia.'}</p>}
      </CardContent>
    </Card>
  )
}

export default AgendaDaSemana
