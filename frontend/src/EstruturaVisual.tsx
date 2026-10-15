import { NavLink, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
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
  const publica = ['/', '/login', '/cadastro', '/esqueci-senha', '/redefinir-senha', '/confirmar-email'].includes(pathname)

  if (!props.autenticado || publica || !props.token) return <EstruturaPublica {...props} />

  return <div className="area-autenticada">
    <a className="pular-conteudo" href="#conteudo">Ir para o conteúdo</a>
    <aside className="sidebar" aria-label="Navegação principal">
      <NavLink className="sidebar__marca" to="/app" aria-label="Estuda — Meus Cursos"><Marca /></NavLink>
      <nav className="sidebar__navegacao">
        {destinos.map(({ url, nome, icone }) => <NavLink key={url} to={url} className={({ isActive }) => `sidebar__item${isActive ? ' sidebar__item--ativo' : ''}`}>
          <IconeDaBarra nome={icone} /><span>{nome}</span>
        </NavLink>)}
      </nav>
      <div className="sidebar__conta"><MenuDaConta token={props.token} onEncerrarSessao={props.onEncerrarSessao} /></div>
    </aside>
    <div id="conteudo" className="area-autenticada__conteudo">{props.children}</div>
  </div>
}
