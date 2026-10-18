import type { ReactNode } from 'react'
import { CheckIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  id?: string
  numero: number
  titulo: string
  concluida: boolean
  /** Sem esta funcao a aula nao pode ser marcada (curso fora do plano ativo). */
  onAlternarConclusao?: () => void
  salvando?: boolean
  atual?: boolean
  onAbrirPdf?: () => void
  recursos?: ReactNode
}

/**
 * Linha reutilizavel de uma aula: marcador de conclusao, titulo (que abre o
 * PDF quando ha material) e os recursos da aula a direita.
 */
export default function AulaRow({ id, numero, titulo, concluida, onAlternarConclusao, salvando = false, atual = false, onAbrirPdf, recursos }: Props) {
  // Topicos de edital costumam ja vir numerados ("11. Coesao"): nao repete.
  const rotulo = /^\d+(\.\d+)*[.)\s]/.test(titulo) ? titulo : `${numero} - ${titulo}`
  return (
    <li
      id={id}
      aria-current={atual ? 'step' : undefined}
      data-concluida={concluida ? 'true' : undefined}
      className={cn(
        'group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/60',
        atual && 'bg-accent ring-1 ring-primary/20 hover:bg-accent',
      )}
    >
      {onAlternarConclusao ? (
        <input
          className="size-5 shrink-0 cursor-pointer rounded accent-primary disabled:cursor-wait disabled:opacity-60"
          type="checkbox"
          checked={concluida}
          disabled={salvando}
          onChange={onAlternarConclusao}
          aria-label={`Concluir aula ${rotulo}`}
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            'flex size-5 shrink-0 items-center justify-center rounded-full border-2',
            concluida ? 'border-success bg-success text-white' : 'border-input',
          )}
        >
          {concluida && <CheckIcon className="size-3" />}
        </span>
      )}
      {onAbrirPdf ? (
        <button
          type="button"
          className={cn('min-w-0 flex-1 text-left text-sm leading-snug font-medium transition-colors hover:text-primary hover:underline', concluida && 'text-muted-foreground line-through decoration-muted-foreground/40')}
          onClick={onAbrirPdf}
        >
          {rotulo}
        </button>
      ) : (
        <span className={cn('min-w-0 flex-1 text-sm leading-snug', concluida && 'text-muted-foreground line-through decoration-muted-foreground/40')}>{rotulo}</span>
      )}
      {recursos && (
        <div className="flex shrink-0 items-center gap-1" role="group" aria-label={`Recursos da aula ${titulo}`}>
          {recursos}
        </div>
      )}
    </li>
  )
}
