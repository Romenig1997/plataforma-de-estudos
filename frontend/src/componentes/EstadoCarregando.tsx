import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export type FormatoDoCarregamento = 'pagina' | 'cartoes' | 'lista' | 'tabela' | 'formulario' | 'linha'

type Props = {
  /** Texto anunciado pelo leitor de tela (visualmente oculto). */
  children: ReactNode
  /** Desenho do skeleton, parecido com o conteudo que vai aparecer. */
  formato?: FormatoDoCarregamento
  className?: string
}

function Cabecalho() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-64 max-w-full" />
      <Skeleton className="h-4 w-96 max-w-full" />
    </div>
  )
}

function Cartoes({ quantidade = 3 }: { quantidade?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: quantidade }, (_, i) => (
        <div key={i} className="flex flex-col overflow-hidden rounded-xl border bg-card">
          <Skeleton className="h-28 rounded-none" />
          <div className="flex flex-col gap-3 p-5">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="mt-2 h-2 w-full rounded-full" />
            <Skeleton className="mt-2 h-9 w-32" />
          </div>
        </div>
      ))}
    </div>
  )
}

function Lista({ linhas = 4 }: { linhas?: number }) {
  return (
    <div className="flex flex-col divide-y rounded-xl border bg-card">
      {Array.from({ length: linhas }, (_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="hidden h-8 w-20 sm:block" />
        </div>
      ))}
    </div>
  )
}

function Tabela() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-full sm:w-40" />
        <Skeleton className="h-10 w-full sm:w-40" />
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <Skeleton className="h-10 rounded-none" />
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-t p-4">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="hidden h-4 flex-1 md:block" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

function Formulario() {
  return (
    <div className="flex flex-col gap-5 rounded-xl border bg-card p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56 max-w-full" />
        </div>
      </div>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-10 w-32" />
    </div>
  )
}

/**
 * Carregamento com skeleton (shadcn/ui): mostra a forma do conteudo que vai
 * chegar, sem pular o layout. O texto fica so para o leitor de tela,
 * anunciado por `role="status"`.
 */
function EstadoCarregando({ children, formato = 'lista', className }: Props) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={cn('flex w-full flex-col gap-6', className)} data-formato={formato}>
      <span className="sr-only">{children}</span>
      {formato === 'pagina' && (
        <>
          <Cabecalho />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </>
      )}
      {formato === 'cartoes' && <Cartoes />}
      {formato === 'lista' && <Lista />}
      {formato === 'tabela' && <Tabela />}
      {formato === 'formulario' && <Formulario />}
      {formato === 'linha' && (
        <div className="flex items-center gap-3">
          <Skeleton className="size-4 rounded-full" />
          <Skeleton className="h-4 w-48 max-w-full" />
        </div>
      )}
    </div>
  )
}

export default EstadoCarregando
