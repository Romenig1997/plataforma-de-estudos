import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
}

/**
 * Tabela no padrao do shadcn/ui. O `thead`/`tbody` ficam por conta da tela;
 * aqui ficam o visual e a rolagem horizontal em telas estreitas.
 */
function Tabela({ children }: Props) {
  return (
    <div
      className="relative w-full overflow-x-auto rounded-xl border bg-card shadow-xs"
      tabIndex={0}
      role="region"
      aria-label="Tabela com rolagem horizontal"
    >
      <table
        className="w-full caption-bottom text-sm [&_tbody_tr]:border-b [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-muted/40 [&_tbody_tr:last-child]:border-0 [&_td]:px-4 [&_td]:py-3 [&_td]:align-middle [&_th]:h-11 [&_th]:px-4 [&_th]:text-left [&_th]:align-middle [&_th]:text-xs [&_th]:font-semibold [&_th]:tracking-wide [&_th]:whitespace-nowrap [&_th]:text-muted-foreground [&_th]:uppercase [&_thead]:bg-muted/60 [&_thead_tr]:border-b"
      >
        {children}
      </table>
    </div>
  )
}

export default Tabela
