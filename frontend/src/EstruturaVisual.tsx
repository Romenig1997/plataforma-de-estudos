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

function IconeDaBarra({ nome }: { nome: Icone | 'mais' }) {
  if (nome === 'cursos') return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 4v16" /></svg>
  if (nome === 'planner') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5h10M9 12h10M9 19h10" /><path d="m4 5 1 1 2-2M4 12l1 1 2-2M4 19l1 1 2-2" /></svg>
  if (nome === 'cronograma') return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M7 11h10m-10 4h6" /></svg>
  if (nome === 'questoes') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h11a3 3 0 0 1 3 3v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><path d="M8 8h7m-7 4h8m-8 4h4" /></svg>
  if (nome === 'mais') return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></svg>
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10m5 10V4m5 16v-7m5 7V7" /><path d="M3 20h18" /></svg>
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
