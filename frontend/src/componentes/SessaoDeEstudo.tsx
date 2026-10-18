import { Link } from 'react-router-dom'
import { BookOpenTextIcon, ClockIcon } from 'lucide-react'

import type { Atividade } from '../cronograma'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
    <li
      data-feita={feita ? 'true' : undefined}
      className={cn('flex flex-col gap-3 rounded-xl border bg-card p-4 transition-colors sm:flex-row sm:items-start sm:gap-5', feita && 'bg-success-soft/50')}
    >
      <p className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary tabular-nums sm:w-28 sm:pt-0.5">
        <ClockIcon className="size-4" aria-hidden="true" />
        {atividade.inicio.slice(0, 5)}–{atividade.fim.slice(0, 5)}
      </p>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="flex flex-wrap items-center gap-2">
          <strong className="font-semibold">{atividade.disciplina}</strong>
          {curso && <Badge variant="secondary" data-curso>{curso}</Badge>}
        </p>
        <p className={cn('text-sm text-muted-foreground', feita && 'line-through decoration-muted-foreground/40')}>
          {atividade.conteudo} <span className="text-xs whitespace-nowrap">(pág. {atividade.pagina})</span>
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2">
          {onConcluir && (
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium" htmlFor={idDaCaixa}>
              <input
                id={idDaCaixa}
                className="size-4 rounded accent-success disabled:cursor-wait"
                type="checkbox"
                checked={feita}
                disabled={salvando}
                aria-label={`Concluir ${atividade.conteudo}`}
                onChange={(evento) => onConcluir(atividade, evento.target.checked)}
              />
              <span aria-hidden="true" className={feita ? 'text-success' : undefined}>{feita ? 'Concluída' : 'Marcar como feita'}</span>
            </label>
          )}
          {atividade.editalId !== undefined && (
            <Button asChild variant="link" size="sm">
              <Link to={`/curso/${atividade.editalId}?aula=${atividade.conteudoId}`} aria-label={`Estudar ${atividade.conteudo}`}>
                <BookOpenTextIcon aria-hidden="true" />
                Estudar
              </Link>
            </Button>
          )}
        </div>
      </div>
    </li>
  )
}

export default SessaoDeEstudo
