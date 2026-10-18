import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type Props = {
  /** `id` do campo: liga o `<label>` ao controle e nomeia os textos de apoio. */
  id: string
  rotulo: string
  /** Mensagem de erro exibida abaixo do campo. */
  erro?: string
  /** Texto de apoio opcional, mais suave que a mensagem de erro. */
  ajuda?: string
  className?: string
  children: ReactNode
}

/**
 * Campo de formulario: `label` ligado por `htmlFor`, o controle (Input,
 * Textarea, NativeSelect) e os textos de ajuda e erro.
 *
 * <p>O componente marca o controle com `aria-invalid` (que aciona a borda
 * vermelha) e `aria-describedby`, para o estado visual e o acessivel nunca
 * ficarem dessincronizados.
 */
function CampoFormulario({ id, rotulo, erro, ajuda, className, children }: Props) {
  const idAjuda = `${id}-ajuda`
  const idErro = `${id}-erro`
  const descritoPor = [ajuda ? idAjuda : null, erro ? idErro : null].filter(Boolean).join(' ') || undefined

  const controle = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id,
        'aria-invalid': erro ? 'true' : 'false',
        'aria-describedby': descritoPor,
      })
    : children

  return (
    <div className={cn('flex min-w-0 flex-col gap-2', className)} data-invalido={erro ? 'true' : undefined}>
      <Label htmlFor={id}>{rotulo}</Label>
      {controle}
      {ajuda && (
        <p id={idAjuda} className="text-xs text-muted-foreground">
          {ajuda}
        </p>
      )}
      {erro && (
        <p id={idErro} className="text-xs font-medium text-destructive" role="alert">
          {erro}
        </p>
      )}
    </div>
  )
}

export default CampoFormulario
