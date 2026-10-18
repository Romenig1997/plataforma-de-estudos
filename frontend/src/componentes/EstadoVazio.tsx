import type { ReactNode } from 'react'
import { InboxIcon } from 'lucide-react'

type Props = {
  children: ReactNode
}

/**
 * Estado vazio: o recurso existe mas nao tem dados a mostrar (ex.: nenhum
 * usuario encontrado no filtro).
 */
function EstadoVazio({ children }: Props) {
  return (
    <div role="status" className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card/50 px-6 py-10 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-hidden="true">
        <InboxIcon className="size-5" />
      </span>
      <p className="max-w-md text-sm text-pretty text-muted-foreground">{children}</p>
    </div>
  )
}

export default EstadoVazio
