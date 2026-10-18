import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'

type Props = {
  /** Texto pequeno acima do titulo. */
  sobretitulo?: string
  titulo: string
  children: ReactNode
  /** Botoes e links de saida da pagina. */
  acoes: ReactNode
  icone?: ReactNode
  /** Repassado ao <main> (ex.: role="alert" na tela de erro). */
  role?: string
}

/**
 * Pagina de estado: endereco inexistente, acesso negado ou falha inesperada.
 * Sempre oferece caminhos claros de volta.
 */
export default function EstadoDePagina({ sobretitulo, titulo, children, acoes, icone, role }: Props) {
  return (
    <main className="flex w-full flex-1 items-center justify-center px-4 py-12 sm:py-20" role={role}>
      <Card className="w-full max-w-lg text-center shadow-lg shadow-brand-navy/5" aria-labelledby="estado-pagina-titulo" role="region">
        <CardContent className="flex flex-col items-center gap-4 px-6 sm:px-10">
          {icone && <span className="flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground [&_svg]:size-6" aria-hidden="true">{icone}</span>}
          {sobretitulo && <span className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">{sobretitulo}</span>}
          <h1 id="estado-pagina-titulo" className="text-2xl font-bold tracking-tight text-balance">{titulo}</h1>
          <p className="text-sm text-pretty text-muted-foreground">{children}</p>
          <div className="mt-2 flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-center">{acoes}</div>
        </CardContent>
      </Card>
    </main>
  )
}
