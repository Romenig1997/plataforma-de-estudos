import { NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  BellIcon,
  BookOpenIcon,
  CalendarClockIcon,
  ChartNoAxesCombinedIcon,
  ClipboardCheckIcon,
  EllipsisIcon,
  FileCheck2Icon,
  FileUpIcon,
  LayoutDashboardIcon,
  MoonIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  SearchIcon,
  ShieldCheckIcon,
  SunIcon,
  Undo2Icon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react'
import MenuDaConta from './MenuDaConta'
import { NAVEGACAO, NAVEGACAO_ADMIN, ROTAS_DE_ACESSO, ROTAS_PUBLICAS, tituloDaRota, type GrupoDeNavegacao, type Icone } from './rotas'
import { useSessao } from './contextoDaSessao'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

type Props = {
  children: ReactNode
  autenticado: boolean
  token: string | null
  onEncerrarSessao: (motivo?: string) => void
}

type Tema = 'claro' | 'escuro'

/** `localStorage` pode estar bloqueado (janela privada, politica do navegador). */
function lerPreferencia(chave: string): string | null {
  try {
    return localStorage.getItem(chave)
  } catch {
    return null
  }
}

function gravarPreferencia(chave: string, valor: string): void {
  try {
    localStorage.setItem(chave, valor)
  } catch {
    // Sem armazenamento a preferencia vale so ate recarregar a pagina.
  }
}

function temaInicial(): Tema {
  const salvo = lerPreferencia('estuda:tema')
  if (salvo === 'escuro' || salvo === 'claro') return salvo
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro'
}

/** Tema aplicado no elemento raiz: vale para a area publica e a autenticada. */
function useTema() {
  const [tema, setTema] = useState<Tema>(temaInicial)
  useEffect(() => {
    document.documentElement.dataset.tema = tema
    document.documentElement.style.colorScheme = tema === 'escuro' ? 'dark' : 'light'
    gravarPreferencia('estuda:tema', tema)
  }, [tema])
  return { tema, alternarTema: () => setTema((atual) => (atual === 'escuro' ? 'claro' : 'escuro')) }
}

/**
 * Titulo da aba por rota e foco no conteudo a cada troca de pagina, para que
 * leitores de tela anunciem a nova pagina (exceto na primeira carga).
 */
function useMudancaDePagina() {
  const { pathname } = useLocation()
  const primeira = useRef(true)
  useEffect(() => {
    document.title = tituloDaRota(pathname)
    if (primeira.current) {
      primeira.current = false
      return
    }
    document.getElementById('conteudo')?.focus({ preventScroll: true })
    window.scrollTo?.(0, 0)
  }, [pathname])
}

/** Logotipo: simbolo "e" e a palavra ESTUDA. com o slogan curto. */
function Marca({ claro = false, compacta = false }: { claro?: boolean; compacta?: boolean }) {
  return (
    <span className="flex items-center gap-2 sm:gap-2.5">
      <span
        aria-hidden="true"
        className="relative flex size-8 shrink-0 sm:size-9 items-center justify-center overflow-hidden rounded-full bg-brand-navy text-lg font-black text-white ring-2 ring-white/10 before:absolute before:inset-x-0 before:top-0 before:h-1/3 before:bg-brand-red"
      >
        <span className="relative">e</span>
      </span>
      <span className={cn('flex flex-col leading-none', compacta && 'sr-only')}>
        <span className={cn('text-base font-black tracking-tight sm:text-lg', claro ? 'text-white' : 'text-foreground')}>
          ESTUDA<span className="text-brand-red">.</span>
        </span>
        <small className={cn('mt-1 hidden text-[0.6rem] font-semibold tracking-[0.18em] sm:block', claro ? 'text-white/60' : 'text-muted-foreground')}>SEU PRÓXIMO PASSO</small>
      </span>
    </span>
  )
}

const ICONES: Record<Icone | 'mais', LucideIcon> = {
  cursos: BookOpenIcon,
  planner: ClipboardCheckIcon,
  cronograma: CalendarClockIcon,
  questoes: FileCheck2Icon,
  desempenho: ChartNoAxesCombinedIcon,
  painel: LayoutDashboardIcon,
  alunos: UsersIcon,
  editais: FileUpIcon,
  aluno: Undo2Icon,
  mais: EllipsisIcon,
}

function IconeDaBarra({ nome }: { nome: Icone | 'mais' }) {
  const Componente = ICONES[nome]
  return <Componente className="size-5 shrink-0" aria-hidden="true" />
}

function BotaoDeTema({ tema, onAlternar }: { tema: Tema; onAlternar: () => void }) {
  const rotulo = tema === 'escuro' ? 'Ativar tema claro' : 'Ativar tema escuro'
  return (
    <Button type="button" variant="ghost" size="icon" className="size-9 rounded-full sm:size-10" aria-label={rotulo} title={rotulo} onClick={onAlternar}>
      {tema === 'escuro' ? <MoonIcon aria-hidden="true" /> : <SunIcon aria-hidden="true" />}
    </Button>
  )
}

function Notificacoes() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="rounded-full" aria-label="Notificações" aria-controls="painel-notificacoes">
          <BellIcon aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent id="painel-notificacoes" align="end" role="region" aria-label="Notificações" className="w-80">
        <div className="flex flex-col gap-3">
          <strong className="text-sm font-semibold">Notificações</strong>
          <div className="flex flex-col items-center gap-2 rounded-lg bg-muted/60 px-4 py-6 text-center">
            <BellIcon className="size-5 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Você não tem notificações novas.</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

const classeDoItem = (ativo: boolean) =>
  cn(
    'group/item relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[0.7rem] font-medium transition-colors lg:flex-none lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:py-2.5 lg:text-sm',
    'text-muted-foreground hover:text-foreground lg:text-sidebar-foreground lg:hover:bg-sidebar-accent/60 lg:hover:text-sidebar-accent-foreground',
    ativo &&
      'text-primary lg:bg-sidebar-accent lg:text-sidebar-accent-foreground lg:before:absolute lg:before:inset-y-2 lg:before:-left-3 lg:before:w-1 lg:before:rounded-r-full lg:before:bg-brand-gold',
  )

/** Destinos que nao cabem na barra inferior do celular. */
function MaisDestinos({ navegacao }: { navegacao: GrupoDeNavegacao[] }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const extras = navegacao.flatMap((grupo) => grupo.destinos).filter((destino) => !destino.noCelular)
  const ativo = extras.some((destino) => pathname.startsWith(destino.url))
  return (
    <div className="flex flex-1 lg:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger className={classeDoItem(ativo)}>
          <IconeDaBarra nome="mais" />
          <span>Mais</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" aria-label="Mais seções">
          {extras.map(({ url, nome, icone }) => (
            <DropdownMenuItem key={url} onSelect={() => navigate(url)}>
              <IconeDaBarra nome={icone} />
              {nome}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function EstruturaPublica({ children, autenticado, token, onEncerrarSessao, tema, onAlternarTema }: Props & { tema: Tema; onAlternarTema: () => void }) {
  const { pathname } = useLocation()
  const acesso = ROTAS_DE_ACESSO.includes(pathname)
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <a className="sr-only z-[60] rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3" href="#conteudo">
        Ir para o conteúdo
      </a>
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-3 sm:gap-4 sm:px-6 lg:px-8">
          <NavLink className="shrink-0 rounded-md" to="/" aria-label="ESTUDA. — início">
            <Marca />
          </NavLink>
          <span className="hidden text-sm text-muted-foreground md:inline">Seu objetivo. Seu ritmo. Sua conquista.</span>
          <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-2">
            <BotaoDeTema tema={tema} onAlternar={onAlternarTema} />
            {autenticado && token ? (
              <>
                <Button asChild variant="ghost" className="hidden sm:inline-flex">
                  <NavLink to="/app">Meus cursos</NavLink>
                </Button>
                <MenuDaConta onEncerrarSessao={onEncerrarSessao} />
              </>
            ) : (
              <>
                {pathname !== '/login' && (
                  <Button asChild variant="ghost" className="h-9 px-2 text-xs sm:h-10 sm:px-4 sm:text-sm">
                    <NavLink to="/login">Entrar</NavLink>
                  </Button>
                )}
                {pathname !== '/cadastro' && (
                  <Button asChild className="h-9 px-3 text-xs sm:h-10 sm:px-4 sm:text-sm">
                    <NavLink to="/cadastro">
                      Criar <span className="hidden sm:inline">minha </span>conta
                    </NavLink>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
        <div className="bg-brand-red px-4 py-1.5 text-center text-[0.7rem] font-semibold tracking-wide text-white sm:text-xs">
          SUA APROVAÇÃO COMEÇA COM UM PLANO <span className="hidden font-normal sm:inline">· Um passo por dia, mais perto do seu objetivo.</span>
        </div>
      </header>

      {acesso ? (
        <div className="flex flex-1 flex-col lg:flex-row">
          <div className="relative overflow-hidden bg-brand-navy px-6 py-10 text-white sm:px-10 lg:flex lg:w-[46%] lg:flex-col lg:justify-center lg:px-16 lg:py-16">
            <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-brand-red/20 blur-3xl" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-16 size-80 rounded-full bg-primary/30 blur-3xl" />
            <div className="relative mx-auto flex max-w-md flex-col gap-4 lg:mx-0">
              <span className="text-xs font-semibold tracking-[0.2em] text-brand-gold">PREPARE O SEU FUTURO</span>
              <p className="text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">
                Grandes conquistas.
                <br />
                <strong className="text-brand-gold">Um estudo de cada vez.</strong>
              </p>
              <p className="hidden text-white/75 sm:block">Organize seu edital, pratique questões e acompanhe cada avanço na sua preparação.</p>
              <div className="mt-2 hidden flex-wrap gap-2 sm:flex">
                {['01 · Planeje', '02 · Pratique', '03 · Evolua'].map((pilar) => (
                  <span key={pilar} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/85">
                    {pilar}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div id="conteudo" tabIndex={-1} className="flex flex-1 items-start justify-center px-4 py-8 outline-none sm:px-6 sm:py-12 lg:items-center">
            {children}
          </div>
        </div>
      ) : (
        <div id="conteudo" tabIndex={-1} className="flex flex-1 flex-col outline-none">
          {children}
        </div>
      )}

      <footer className="border-t bg-card">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <strong className="font-black text-foreground">
            ESTUDA<span className="text-brand-red">.</span>
          </strong>
          <span>Planejamento, prática e evolução em um só lugar.</span>
          <span>Plataforma de estudos</span>
        </div>
      </footer>
    </div>
  )
}

export default function EstruturaVisual(props: Props) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [parametros] = useSearchParams()
  const { tema, alternarTema } = useTema()
  const { usuario } = useSessao()
  const [barraRecolhida, setBarraRecolhida] = useState(() => lerPreferencia('estuda:sidebar-recolhida') === 'true')
  const [busca, setBusca] = useState(() => parametros.get('buscar') ?? '')
  useMudancaDePagina()

  useEffect(() => {
    gravarPreferencia('estuda:sidebar-recolhida', String(barraRecolhida))
  }, [barraRecolhida])

  // Painel de gestao: so nas rotas /admin e so para quem a sessao diz ser ADMIN.
  // Um ALUNO que abre /admin continua na casca do aluno, com a pagina de acesso negado.
  const painelAdmin = pathname.startsWith('/admin') && Boolean(props.token) && usuario?.perfil === 'ADMIN'
  const navegacao = painelAdmin ? NAVEGACAO_ADMIN : NAVEGACAO
  const inicio = painelAdmin ? '/admin' : '/app'
  const destinoDaBusca = painelAdmin ? '/admin/alunos' : '/app'
  const rotuloDaBusca = painelAdmin ? 'Buscar alunos por nome ou e-mail' : 'Buscar nos meus cursos'

  function pesquisar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const termo = busca.trim()
    navigate(termo ? `${destinoDaBusca}?buscar=${encodeURIComponent(termo)}` : destinoDaBusca)
  }

  if (!props.autenticado || ROTAS_PUBLICAS.includes(pathname) || !props.token) {
    return <EstruturaPublica {...props} tema={tema} onAlternarTema={alternarTema} />
  }

  const rotuloRecolher = barraRecolhida ? 'Expandir barra lateral' : 'Recolher barra lateral'

  return (
    <div className="min-h-svh bg-background" data-recolhida={barraRecolhida ? 'true' : undefined}>
      <a className="sr-only z-[60] rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3" href="#conteudo">
        Ir para o conteúdo
      </a>

      <aside
        aria-label={painelAdmin ? 'Navegação administrativa' : 'Navegação principal'}
        className={cn(
          'fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur',
          'lg:inset-y-0 lg:right-auto lg:flex lg:flex-col lg:border-t-0 lg:border-r lg:border-sidebar-border lg:bg-sidebar lg:pb-0 lg:text-sidebar-foreground lg:transition-[width] lg:duration-200',
          barraRecolhida ? 'lg:w-[4.75rem]' : 'lg:w-64',
        )}
      >
        <div className={cn('hidden h-16 shrink-0 items-center border-b border-sidebar-border lg:flex', barraRecolhida ? 'justify-center px-2' : 'px-5')}>
          <NavLink className="rounded-md" to={inicio} aria-label={painelAdmin ? 'ESTUDA. — Painel de gestão' : 'ESTUDA. — Meus cursos'}>
            <Marca claro compacta={barraRecolhida} />
          </NavLink>
        </div>
        {painelAdmin && !barraRecolhida && (
          <span className="mx-5 mt-4 hidden items-center gap-2 rounded-md bg-brand-gold/15 px-2.5 py-1.5 text-xs font-semibold text-brand-gold lg:flex">
            <ShieldCheckIcon className="size-3.5" aria-hidden="true" />
            Painel de gestão
          </span>
        )}
        <nav
          className="mx-auto flex h-16 max-w-lg items-stretch gap-1 px-2 lg:mx-0 lg:h-auto lg:max-w-none lg:flex-1 lg:flex-col lg:gap-6 lg:overflow-y-auto lg:px-3 lg:py-5"
          aria-label={painelAdmin ? 'Seções do painel de gestão' : 'Seções da plataforma'}
        >
          {navegacao.map((grupo) => (
            <div className="contents lg:flex lg:flex-col lg:gap-1" key={grupo.nome} role="group" aria-label={grupo.nome}>
              <span
                className={cn('hidden px-3 pb-1 text-[0.65rem] font-semibold tracking-[0.16em] text-sidebar-foreground/85 uppercase lg:block', barraRecolhida && 'lg:sr-only')}
                aria-hidden="true"
              >
                {grupo.nome}
              </span>
              {grupo.destinos.map(({ url, nome, icone, noCelular }) => (
                <NavLink
                  key={url}
                  to={url}
                  end={url === '/admin'}
                  title={barraRecolhida ? nome : undefined}
                  className={({ isActive }) =>
                    cn(
                      classeDoItem(isActive || (url === '/app' && !painelAdmin && pathname.startsWith('/curso/'))),
                      !noCelular && 'hidden lg:flex',
                      barraRecolhida && 'lg:justify-center lg:px-0',
                    )
                  }
                >
                  <IconeDaBarra nome={icone} />
                  <span className={cn('max-w-full truncate', barraRecolhida && 'lg:sr-only')}>{nome}</span>
                </NavLink>
              ))}
            </div>
          ))}
          <MaisDestinos navegacao={navegacao} />
        </nav>
      </aside>

      <div className={cn('flex min-h-svh flex-col pb-20 lg:pb-0 lg:transition-[padding] lg:duration-200', barraRecolhida ? 'lg:pl-[4.75rem]' : 'lg:pl-64')}>
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:gap-3 sm:px-6 lg:px-8">
          <NavLink className="rounded-md lg:hidden" to={inicio} aria-label={painelAdmin ? 'ESTUDA. — Painel de gestão' : 'ESTUDA. — Meus cursos'}>
            <Marca compacta />
          </NavLink>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden lg:inline-flex"
            aria-label={rotuloRecolher}
            title={rotuloRecolher}
            aria-pressed={barraRecolhida}
            onClick={() => setBarraRecolhida((valor) => !valor)}
          >
            {barraRecolhida ? <PanelLeftOpenIcon aria-hidden="true" /> : <PanelLeftCloseIcon aria-hidden="true" />}
          </Button>
          <form className="relative min-w-0 flex-1 md:max-w-md" role="search" onSubmit={pesquisar}>
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
              placeholder={rotuloDaBusca}
              aria-label={rotuloDaBusca}
              className="h-10 w-full min-w-0 rounded-full border border-input bg-card pr-4 pl-9 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
            />
          </form>
          {painelAdmin && (
            <Badge variant="warning" className="hidden sm:inline-flex">
              <ShieldCheckIcon aria-hidden="true" />
              Administrador
            </Badge>
          )}
          <div className="ml-auto flex items-center gap-1">
            <BotaoDeTema tema={tema} onAlternar={alternarTema} />
            <Notificacoes />
            <MenuDaConta onEncerrarSessao={props.onEncerrarSessao} />
          </div>
        </header>
        <div id="conteudo" tabIndex={-1} className="flex flex-1 flex-col outline-none">
          {props.children}
        </div>
      </div>
    </div>
  )
}
