import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type CabecalhoProps = {
  sobretitulo: string
  titulo: string
  descricao?: ReactNode
  /** Acoes do cabecalho: a primeira e a principal da pagina. */
  acoes?: ReactNode
}

/**
 * Cabecalho padrao das paginas: contexto (sobretitulo), titulo `h1`, uma
 * linha de descricao e as acoes, que descem para baixo do titulo no celular.
 */
export function CabecalhoDaPagina({ sobretitulo, titulo, descricao, acoes }: CabecalhoProps) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">{sobretitulo}</span>
        <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">{titulo}</h1>
        {descricao && <p className="max-w-2xl text-sm text-pretty text-muted-foreground sm:text-base">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">{acoes}</div>}
    </header>
  )
}

type IndicadorProps = { rotulo: string; valor: ReactNode; detalhe?: ReactNode; icone?: ReactNode }

/** Numero-chave da pagina (progresso, acertos, proxima atividade). */
export function Indicador({ rotulo, valor, detalhe, icone }: IndicadorProps) {
  return (
    <Card className="gap-2 py-5">
      <CardContent className="flex flex-col gap-1.5 px-5">
        <span className="flex items-center justify-between gap-2 text-sm font-medium text-muted-foreground">
          {rotulo}
          {icone && <span className="text-muted-foreground [&_svg]:size-4" aria-hidden="true">{icone}</span>}
        </span>
        <strong className="text-2xl font-bold tracking-tight tabular-nums">{valor}</strong>
        {detalhe && <span className="text-xs text-muted-foreground">{detalhe}</span>}
      </CardContent>
    </Card>
  )
}

/** Grade responsiva de indicadores: 1, 2 ou 4 colunas conforme a largura. */
export function GradeDeIndicadores({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4', className)}>{children}</div>
}

type EstadoProps = { titulo: string; children: ReactNode; acao?: { texto: string; para: string }; icone?: ReactNode }

/** Estado vazio com orientacao e um proximo passo. */
export function EstadoSemDados({ titulo, children, acao, icone }: EstadoProps) {
  return (
    <section role="status" className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-6 py-12 text-center">
      {icone && <span className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground [&_svg]:size-5" aria-hidden="true">{icone}</span>}
      <h2 className="text-lg font-semibold">{titulo}</h2>
      <p className="max-w-md text-sm text-pretty text-muted-foreground">{children}</p>
      {acao && (
        <Button asChild className="mt-2">
          <Link to={acao.para}>{acao.texto}</Link>
        </Button>
      )}
    </section>
  )
}

/** Secao da pagina em cartao, com titulo `h2` e uma acao opcional. */
export function Painel({ titulo, id, children, acao, className }: { titulo: string; id: string; children: ReactNode; acao?: ReactNode; className?: string }) {
  return (
    <Card className={cn('gap-4', className)} aria-labelledby={id} role="region">
      <CardHeader>
        <CardTitle>
          <h2 id={id} className="text-base font-semibold">{titulo}</h2>
        </CardTitle>
        {acao && <CardAction>{acao}</CardAction>}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  )
}

/** Container de pagina da area autenticada: largura maxima e ritmo vertical. */
export function Conteudo({ children, className, largura = 'padrao' }: { children: ReactNode; className?: string; largura?: 'padrao' | 'estreita' | 'larga' }) {
  return (
    <main
      className={cn(
        'mx-auto flex w-full flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8',
        largura === 'estreita' ? 'max-w-3xl' : largura === 'larga' ? 'max-w-7xl' : 'max-w-6xl',
        className,
      )}
    >
      {children}
    </main>
  )
}
