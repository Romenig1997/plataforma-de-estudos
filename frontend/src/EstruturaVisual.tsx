import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import MenuDaConta from './MenuDaConta'

type Icone = 'cursos' | 'cronograma' | 'questoes' | 'desempenho'
const destinos: { url: string; nome: string; icone: Icone }[] = [
  { url: '/app', nome: 'Meus Cursos', icone: 'cursos' },
  { url: '/cronograma', nome: 'Cronograma', icone: 'cronograma' },
  { url: '/questoes', nome: 'Banco de Questões', icone: 'questoes' },
  { url: '/dashboard', nome: 'Desempenho', icone: 'desempenho' },
]

type Props = {
  children: ReactNode
  autenticado: boolean
  token: string | null
  onEncerrarSessao: (motivo?: string) => void
}

function Marca() {
  return <><span className="marca__simbolo" aria-hidden="true">e</span><span>ESTUDA<span className="marca__ponto">.</span><small>SEU PRÓXIMO PASSO</small></span></>
}

function IconeDaBarra({ nome }: { nome: Icone }) {
  if (nome === 'cursos') return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 4v16" /></svg>
  if (nome === 'cronograma') return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M7 11h10m-10 4h6" /></svg>
  if (nome === 'questoes') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h11a3 3 0 0 1 3 3v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><path d="M8 8h7m-7 4h8m-8 4h4" /></svg>
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10m5 10V4m5 16v-7m5 7V7" /><path d="M3 20h18" /></svg>
}

function IconeDoTopo({ nome }: { nome: 'menu' | 'busca' | 'sol' | 'lua' | 'sino' }) {
  if (nome === 'menu') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M5 12h10M5 17h7" /></svg>
  if (nome === 'busca') return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></svg>
  if (nome === 'sol') return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
  if (nome === 'lua') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" /></svg>
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
}

function EstruturaPublica({ children, autenticado, token, onEncerrarSessao }: Props) {
  const { pathname } = useLocation()
  const publico = ['/login', '/cadastro', '/esqueci-senha', '/redefinir-senha', '/confirmar-email'].includes(pathname)
  return <div className={publico ? 'portal portal--publico' : 'portal'}>
    <a className="pular-conteudo" href="#conteudo">Ir para o conteúdo</a>
    <header className="portal-topo">
      <div className="portal-topo__linha">
        <NavLink className="marca" to={autenticado ? '/app' : '/'} aria-label="Plataforma de estudos — início"><Marca /></NavLink>
        <span className="portal-topo__mensagem">Seu objetivo. Seu ritmo. Sua conquista.</span>
        {autenticado && token ? <MenuDaConta token={token} onEncerrarSessao={onEncerrarSessao} /> : <NavLink className="portal-conta" to="/cadastro">Criar minha conta <span aria-hidden="true">↗</span></NavLink>}
      </div>
    </header>
    <div className="portal-faixa">SUA APROVAÇÃO COMEÇA COM UM PLANO <span>Um passo por dia, mais perto do seu objetivo.</span></div>
    {publico && <div className="portal-apresentacao"><span className="sobretitulo">PREPARE O SEU FUTURO</span><h2>Grandes conquistas.<br /><strong>Um estudo de cada vez.</strong></h2><p>Organize seu edital, pratique questões e acompanhe cada avanço na sua preparação.</p><div className="portal-pilares"><span>01 · Planeje</span><span>02 · Pratique</span><span>03 · Evolua</span></div></div>}
    <div id="conteudo" className="portal-conteudo">{children}</div>
    <footer className="portal-rodape"><strong>ESTUDA.</strong><span>Planejamento, prática e evolução em um só lugar.</span><span>Plataforma de estudos</span></footer>
  </div>
}

export default function EstruturaVisual(props: Props) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const publica = ['/', '/login', '/cadastro', '/esqueci-senha', '/redefinir-senha', '/confirmar-email'].includes(pathname)
  const [barraRecolhida, setBarraRecolhida] = useState(() => localStorage.getItem('estuda:sidebar-recolhida') === 'true')
  const [temaEscuro, setTemaEscuro] = useState(() => localStorage.getItem('estuda:tema') === 'escuro')
  const [busca, setBusca] = useState('')
  const [notificacoesAbertas, setNotificacoesAbertas] = useState(false)

  useEffect(() => { localStorage.setItem('estuda:sidebar-recolhida', String(barraRecolhida)) }, [barraRecolhida])
  useEffect(() => { localStorage.setItem('estuda:tema', temaEscuro ? 'escuro' : 'claro') }, [temaEscuro])

  function pesquisar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const termo = busca.trim()
    navigate(termo ? `/app?buscar=${encodeURIComponent(termo)}` : '/app')
  }

  if (!props.autenticado || publica || !props.token) return <EstruturaPublica {...props} />

  return <div className={`area-autenticada${barraRecolhida ? ' area-autenticada--recolhida' : ''}${temaEscuro ? ' area-autenticada--escura' : ''}`}>
    <a className="pular-conteudo" href="#conteudo">Ir para o conteúdo</a>
    <header className="barra-superior">
      <button type="button" className="barra-superior__icone" aria-label={barraRecolhida ? 'Expandir barra lateral' : 'Recolher barra lateral'} title={barraRecolhida ? 'Expandir barra lateral' : 'Recolher barra lateral'} onClick={() => setBarraRecolhida(valor => !valor)}><IconeDoTopo nome="menu" /></button>
      <form className="barra-superior__busca" role="search" onSubmit={pesquisar}>
        <IconeDoTopo nome="busca" /><input type="search" value={busca} onChange={evento => setBusca(evento.target.value)} placeholder="Qual curso você está procurando?" aria-label="Pesquisar cursos" />
      </form>
      <div className="barra-superior__acoes">
        <button type="button" className="barra-superior__icone" aria-label={temaEscuro ? 'Ativar tema claro' : 'Ativar tema escuro'} title={temaEscuro ? 'Ativar tema claro' : 'Ativar tema escuro'} onClick={() => setTemaEscuro(valor => !valor)}><IconeDoTopo nome={temaEscuro ? 'lua' : 'sol'} /></button>
        <div className="barra-superior__notificacoes">
          <button type="button" className="barra-superior__icone" aria-label="Notificações" aria-expanded={notificacoesAbertas} aria-haspopup="menu" onClick={() => setNotificacoesAbertas(valor => !valor)}><IconeDoTopo nome="sino" /><span aria-hidden="true" /></button>
          {notificacoesAbertas && <div className="painel-notificacoes" role="menu"><strong>Notificações</strong><p>Você não tem notificações novas.</p></div>}
        </div>
        <div className="barra-superior__conta"><MenuDaConta token={props.token} onEncerrarSessao={props.onEncerrarSessao} /></div>
      </div>
    </header>
    <aside className="sidebar" aria-label="Navegação principal">
      <NavLink className="sidebar__marca" to="/app" aria-label="Estuda — Meus Cursos"><Marca /></NavLink>
      <nav className="sidebar__navegacao">
        {destinos.map(({ url, nome, icone }) => <NavLink key={url} to={url} className={({ isActive }) => `sidebar__item${isActive ? ' sidebar__item--ativo' : ''}`}>
          <IconeDaBarra nome={icone} /><span>{nome}</span>
        </NavLink>)}
      </nav>
    </aside>
    <div id="conteudo" className="area-autenticada__conteudo">{props.children}</div>
  </div>
}
