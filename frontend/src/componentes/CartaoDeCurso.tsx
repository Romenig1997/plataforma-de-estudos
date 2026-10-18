import type { ReactNode } from 'react'
import { EllipsisVerticalIcon } from 'lucide-react'
import { urlDoBanner } from '../editais'
import { Card } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

export type OpcaoDoMenu = { rotulo: string; onSelecionar: () => void; perigo?: boolean; desabilitada?: boolean }

type DadosDaCapa = { editalId: number; titulo: string; sigla: string; bannerVersao: number | null }

/** Cor da capa sem banner: estavel por curso. */
const CORES = [
  'from-[#1a56a8] to-[#0b1f3a]',
  'from-[#5b3fb8] to-[#2a1d63]',
  'from-[#0f6e6a] to-[#073a3f]',
]

/** Menu "Mais opcoes" do card (DropdownMenu do shadcn/ui). */
function MenuDoCurso({ titulo, opcoes }: { titulo: string; opcoes: OpcaoDoMenu[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="absolute top-3 right-3 z-10 flex size-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors outline-none hover:bg-black/45 focus-visible:ring-[3px] focus-visible:ring-white/60"
        aria-label={`Mais opções de ${titulo}`}
      >
        <EllipsisVerticalIcon className="size-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {opcoes.map((opcao) => (
          <DropdownMenuItem key={opcao.rotulo} disabled={opcao.desabilitada} variant={opcao.perigo ? 'destructive' : 'default'} onSelect={() => opcao.onSelecionar()}>
            {opcao.rotulo}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Capa do card: banner enviado pelo admin (ou a cor do curso) com o nome do
 * curso por cima. O degrade escuro embaixo mantem o nome legivel em qualquer imagem.
 */
export function CapaDoCurso({ editalId, titulo, sigla, bannerVersao, menu, className }: DadosDaCapa & { menu?: OpcaoDoMenu[]; className?: string }) {
  return (
    <div className={cn('relative isolate flex min-h-32 flex-col justify-end overflow-hidden bg-gradient-to-br p-4 text-white sm:p-5', CORES[editalId % CORES.length], className)}>
      {bannerVersao && (
        <img className="curso-capa__imagem absolute inset-0 -z-10 size-full object-cover" src={urlDoBanner(editalId, bannerVersao)} alt="" loading="lazy" />
      )}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
      {sigla && (
        <span className="absolute top-3 left-3 rounded-md border border-white/25 bg-white/15 px-2 py-0.5 text-[0.7rem] font-bold tracking-wide backdrop-blur-sm">
          {sigla}
        </span>
      )}
      <h3 className="pr-8 text-lg leading-snug font-semibold text-balance drop-shadow-sm">{titulo}</h3>
      {menu && menu.length > 0 && <MenuDoCurso titulo={titulo} opcoes={menu} />}
    </div>
  )
}

type Props = DadosDaCapa & {
  orgao: string
  ano: number
  /** Curso em foco: card largo, no topo da pagina. */
  destaque?: boolean
  selo?: ReactNode
  menu?: OpcaoDoMenu[]
  children: ReactNode
}

/** Card de curso reutilizado em Meus cursos (inscritos, em foco e vitrine). */
function CartaoDeCurso({ orgao, ano, destaque = false, selo, menu, children, ...capa }: Props) {
  return (
    <Card
      role="article"
      aria-label={capa.titulo}
      data-destaque={destaque ? 'true' : undefined}
      className={cn(
        'group gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md',
        destaque && 'md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:shadow-md',
      )}
    >
      <CapaDoCurso {...capa} menu={menu} className={cn(destaque && 'min-h-40 md:min-h-full md:p-6')} />
      <div className={cn('flex flex-1 flex-col gap-4 p-5', destaque && 'md:p-6')}>
        <p className="flex flex-wrap items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {selo}
          <span>
            {orgao} · {ano}
          </span>
        </p>
        {children}
      </div>
    </Card>
  )
}

/** Barra de progresso do card, em topicos concluidos. */
export function ProgressoDoCurso({ titulo, concluidos, total, progresso }: { titulo: string; concluidos: number; total: number; progresso: number }) {
  const texto = progresso.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
  return (
    <div className="flex flex-col gap-2">
      <Progress value={progresso} aria-label={`Progresso em ${titulo}: ${texto}%`} />
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{concluidos ? `${concluidos} de ${total} tópicos concluídos` : 'Ainda não começou'}</span>
        <strong className="text-sm font-semibold text-foreground tabular-nums">{texto}%</strong>
      </div>
    </div>
  )
}

export default CartaoDeCurso
