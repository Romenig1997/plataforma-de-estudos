import type { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type Props = {
  /** Largura maior, para telas que precisam de mais espaco. */
  largo?: boolean
  titulo: string
  descricao?: string
  children: ReactNode
}

/**
 * Cartao central das telas de acesso (login, cadastro, recuperacao). O titulo
 * e o `h1` da pagina.
 */
function Cartao({ largo = false, titulo, descricao, children }: Props) {
  return (
    <Card className={cn('w-full gap-6 shadow-lg shadow-brand-navy/5', largo ? 'max-w-3xl' : 'max-w-md')}>
      <CardHeader className="gap-2 text-center">
        <CardTitle>
          <h1 className="text-2xl font-bold tracking-tight text-balance">{titulo}</h1>
        </CardTitle>
        {descricao && <CardDescription className="text-pretty">{descricao}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  )
}

export default Cartao
