import { NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import MenuDaConta from './MenuDaConta'
import { usePopover } from './componentes/usePopover'
import { NAVEGACAO, ROTAS_DE_ACESSO, ROTAS_PUBLICAS, tituloDaRota, type Icone } from './rotas'

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

function Marca() {
  return <><span className="marca__simbolo" aria-hidden="true">e</span><span>ESTUDA<span className="marca__ponto">.</span><small>SEU PRÓXIMO PASSO</small></span></>
}

/**
 * Icones da barra lateral em dois tons: `icone__fundo` e um preenchimento
 * suave (o CSS controla a opacidade, mais forte no item ativo) e o resto e traco.
 */
function IconeDaBarra({ nome }: { nome: Icone | 'mais' }) {
  // Livro aberto: os cursos em que o aluno estuda.
  if (nome === 'cursos') return <svg viewBox="0 0 24 24" aria-hidden="true">
    <path className="icone__fundo" d="M3 5.5c2.7-1.1 5.7-.8 9 1.2v13c-3.3-2-6.3-2.3-9-1.2zm18 0c-2.7-1.1-5.7-.8-9 1.2v13c3.3-2 6.3-2.3 9-1.2z" />
    <path d="M3 5.5c2.7-1.1 5.7-.8 9 1.2 3.3-2 6.3-2.3 9-1.2v13c-2.7-1.1-5.7-.8-9 1.2-3.3-2-6.3-2.3-9-1.2zM12 6.7v13" />
  </svg>
  // Prancheta com itens marcados: metas e prioridades do plano.
  if (nome === 'planner') return <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect className="icone__fundo" x="5" y="4" width="14" height="17" rx="2.5" />
    <rect x="5" y="4" width="14" height="17" rx="2.5" />
    <path d="M9 4V3.5A1.5 1.5 0 0 1 10.5 2h3A1.5 1.5 0 0 1 15 3.5V4M8.5 11l1.5 1.5L12.5 10M14.5 11.5H16M8.5 16l1.5 1.5L12.5 15M14.5 16.5H16" />
  </svg>
  // Calendario com relogio: horarios da semana.
  if (nome === 'cronograma') return <svg viewBox="0 0 24 24" aria-hidden="true">
    <path className="icone__fundo" d="M3 10V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3z" />
    <path d="M21 11.5V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6.5M8 3v4M16 3v4M3 10h18" />
    <circle cx="17.5" cy="17.5" r="4" />
    <path d="M17.5 15.8v1.7l1.1 1.1" />
  </svg>
  // Folha com marca de acerto: questoes para praticar.
  if (nome === 'questoes') return <svg viewBox="0 0 24 24" aria-hidden="true">
    <path className="icone__fundo" d="M6 3h8l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    <path d="M6 3h8l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM14 3v5h5M8.5 14.5l2 2 4-4" />
  </svg>
  if (nome === 'mais') return <svg viewBox="0 0 24 24" aria-hidden="true" className="icone--pontos"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>
  // Linha em alta com area preenchida: evolucao de desempenho.
  return <svg viewBox="0 0 24 24" aria-hidden="true">
    <path className="icone__fundo" d="M7 15l4-4 3 3 6-6v12H7z" />
    <path d="M3 3v16a2 2 0 0 0 2 2h16M7 15l4-4 3 3 6-6M16 8h4v4" />
  </svg>
}

function IconeDoTopo({ nome }: { nome: 'menu' | 'busca' | 'sol' | 'lua' | 'sino' }) {
  if (nome === 'menu') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M5 12h10M5 17h7" /></svg>
  if (nome === 'busca') return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></svg>
  if (nome === 'sol') return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
  if (nome === 'lua') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" /></svg>
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
}

function BotaoDeTema({ tema, onAlternar, classe }: { tema: Tema; onAlternar: () => void; classe: string }) {
  const rotulo = tema === 'escuro' ? 'Ativar tema claro' : 'Ativar tema escuro'
  return <button type="button" className={classe} aria-label={rotulo} title={rotulo} onClick={onAlternar}><IconeDoTopo nome={tema === 'escuro' ? 'lua' : 'sol'} /></button>
}

function Notificacoes() {
  const { aberto, setAberto, container } = usePopover()
  return <div className="barra-superior__notificacoes" ref={container}>
    <button type="button" className="barra-superior__icone" aria-label="Notificações" aria-expanded={aberto} aria-controls="painel-notificacoes" onClick={() => setAberto(valor => !valor)}><IconeDoTopo nome="sino" /></button>
    {aberto && <div id="painel-notificacoes" className="painel-notificacoes" role="region" aria-label="Notificações"><strong>Notificações</strong><p>Você não tem notificações novas.</p></div>}
  </div>
}

/** Destinos que nao cabem na barra inferior do celular. */
function MaisDestinos() {
  const { aberto, setAberto, container } = usePopover()
  const { pathname } = useLocation()
  const extras = NAVEGACAO.flatMap(grupo => grupo.destinos).filter(destino => !destino.noCelular)
  const ativo = extras.some(destino => pathname.startsWith(destino.url))
  return <div className="sidebar__mais" ref={container}>
    <button type="button" className={`sidebar__item${ativo ? ' sidebar__item--ativo' : ''}`} aria-expanded={aberto} aria-controls="navegacao-mais" onClick={() => setAberto(valor => !valor)}>
      <IconeDaBarra nome="mais" /><span>Mais</span>
    </button>
    {aberto && <div id="navegacao-mais" className="sidebar__mais-painel">
      {extras.map(({ url, nome, icone }) => <NavLink key={url} to={url} onClick={() => setAberto(false)} className={({ isActive }) => `sidebar__item${isActive ? ' sidebar__item--ativo' : ''}`}><IconeDaBarra nome={icone} /><span>{nome}</span></NavLink>)}
    </div>}
  </div>
}

function EstruturaPublica({ children, autenticado, token, onEncerrarSessao, tema, onAlternarTema }: Props & { tema: Tema; onAlternarTema: () => void }) {
  const { pathname } = useLocation()
  const acesso = ROTAS_DE_ACESSO.includes(pathname)
  return <div className={acesso ? 'portal portal--publico' : 'portal'}>
    <a className="pular-conteudo" href="#conteudo">Ir para o conteúdo</a>
    <header className="portal-topo">
      <div className="portal-topo__linha">
        <NavLink className="marca" to="/" aria-label="ESTUDA. — início"><Marca /></NavLink>
        <span className="portal-topo__mensagem">Seu objetivo. Seu ritmo. Sua conquista.</span>
        <div className="portal-topo__acoes">
          <BotaoDeTema tema={tema} onAlternar={onAlternarTema} classe="portal-tema" />
          {autenticado && token
            ? <><NavLink className="portal-entrar" to="/app">Meus cursos</NavLink><MenuDaConta token={token} onEncerrarSessao={onEncerrarSessao} /></>
            : <>
              {pathname !== '/login' && <NavLink className="portal-entrar" to="/login">Entrar</NavLink>}
              {pathname !== '/cadastro' && <NavLink className="portal-conta" to="/cadastro">Criar <span className="portal-conta__extra">minha </span>conta</NavLink>}
            </>}
        </div>
      </div>
    </header>
    <div className="portal-faixa">SUA APROVAÇÃO COMEÇA COM UM PLANO <span>Um passo por dia, mais perto do seu objetivo.</span></div>
    {acesso && <div className="portal-apresentacao"><span className="sobretitulo">PREPARE O SEU FUTURO</span><p className="portal-apresentacao__titulo">Grandes conquistas.<br /><strong>Um estudo de cada vez.</strong></p><p>Organize seu edital, pratique questões e acompanhe cada avanço na sua preparação.</p><div className="portal-pilares"><span>01 · Planeje</span><span>02 · Pratique</span><span>03 · Evolua</span></div></div>}
    <div id="conteudo" tabIndex={-1} className="portal-conteudo">{children}</div>
    <footer className="portal-rodape"><strong>ESTUDA.</strong><span>Planejamento, prática e evolução em um só lugar.</span><span>Plataforma de estudos</span></footer>
  </div>
}

export default function EstruturaVisual(props: Props) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [parametros] = useSearchParams()
  const { tema, alternarTema } = useTema()
  const [barraRecolhida, setBarraRecolhida] = useState(() => lerPreferencia('estuda:sidebar-recolhida') === 'true')
  const [busca, setBusca] = useState(() => parametros.get('buscar') ?? '')
  useMudancaDePagina()

  useEffect(() => { gravarPreferencia('estuda:sidebar-recolhida', String(barraRecolhida)) }, [barraRecolhida])

  function pesquisar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const termo = busca.trim()
    navigate(termo ? `/app?buscar=${encodeURIComponent(termo)}` : '/app')
  }

  if (!props.autenticado || ROTAS_PUBLICAS.includes(pathname) || !props.token) {
    return <EstruturaPublica {...props} tema={tema} onAlternarTema={alternarTema} />
  }

  return <div className={`area-autenticada${barraRecolhida ? ' area-autenticada--recolhida' : ''}`}>
    <a className="pular-conteudo" href="#conteudo">Ir para o conteúdo</a>
    <header className="barra-superior">
      <button type="button" className="barra-superior__icone barra-superior__recolher" aria-label={barraRecolhida ? 'Expandir barra lateral' : 'Recolher barra lateral'} title={barraRecolhida ? 'Expandir barra lateral' : 'Recolher barra lateral'} aria-pressed={barraRecolhida} onClick={() => setBarraRecolhida(valor => !valor)}><IconeDoTopo nome="menu" /></button>
      <form className="barra-superior__busca" role="search" onSubmit={pesquisar}>
        <IconeDoTopo nome="busca" /><input type="search" value={busca} onChange={evento => setBusca(evento.target.value)} placeholder="Buscar nos meus cursos" aria-label="Buscar nos meus cursos" />
      </form>
      <div className="barra-superior__acoes">
        <BotaoDeTema tema={tema} onAlternar={alternarTema} classe="barra-superior__icone" />
        <Notificacoes />
        <div className="barra-superior__conta"><MenuDaConta token={props.token} onEncerrarSessao={props.onEncerrarSessao} /></div>
      </div>
    </header>
    <aside className="sidebar" aria-label="Navegação principal">
      <NavLink className="sidebar__marca" to="/app" aria-label="ESTUDA. — Meus cursos"><Marca /></NavLink>
      <nav className="sidebar__navegacao" aria-label="Seções da plataforma">
        {NAVEGACAO.map(grupo => <div className="sidebar__grupo" key={grupo.nome} role="group" aria-label={grupo.nome}>
          <span className="sidebar__grupo-nome" aria-hidden="true">{grupo.nome}</span>
          {grupo.destinos.map(({ url, nome, icone, noCelular }) => <NavLink key={url} to={url} title={barraRecolhida ? nome : undefined} className={({ isActive }) => `sidebar__item${isActive || (url === '/app' && pathname.startsWith('/curso/')) ? ' sidebar__item--ativo' : ''}${noCelular ? '' : ' sidebar__item--so-desktop'}`}>
            <IconeDaBarra nome={icone} /><span>{nome}</span>
          </NavLink>)}
        </div>)}
        <MaisDestinos />
      </nav>
    </aside>
    <div id="conteudo" tabIndex={-1} className="area-autenticada__conteudo">{props.children}</div>
  </div>
}
