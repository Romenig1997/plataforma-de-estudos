import { NavLink, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import MenuDaConta from './MenuDaConta'

const destinos = [['/app', 'Início'], ['/planner', 'Planejamento'], ['/cronograma', 'Cronograma'], ['/questoes', 'Questões'], ['/dashboard', 'Meu progresso'], ['/analise', 'Recomendações']] as const

type Props = {
  children: ReactNode
  autenticado: boolean
  token: string | null
  onEncerrarSessao: (motivo?: string) => void
}

export default function EstruturaVisual({ children, autenticado, token, onEncerrarSessao }: Props) {
  const { pathname } = useLocation()
  const publico = ['/login', '/cadastro', '/esqueci-senha', '/redefinir-senha', '/confirmar-email'].includes(pathname)
  return <div className={publico ? 'portal portal--publico' : 'portal'}>
    <a className="pular-conteudo" href="#conteudo">Ir para o conteúdo</a>
    <header className="portal-topo">
      <div className="portal-topo__linha">
        <NavLink className="marca" to={autenticado ? '/app' : '/'} aria-label="Plataforma de estudos — início"><span className="marca__simbolo" aria-hidden="true">e</span><span>ESTUDA<span className="marca__ponto">.</span><small>SEU PRÓXIMO PASSO</small></span></NavLink>
        <span className="portal-topo__mensagem">Seu objetivo. Seu ritmo. Sua conquista.</span>
        {autenticado && token ? (
          <MenuDaConta token={token} onEncerrarSessao={onEncerrarSessao} />
        ) : (
          <NavLink className="portal-conta" to="/cadastro">Criar minha conta <span aria-hidden="true">↗</span></NavLink>
        )}
      </div>
      <nav className="portal-nav" aria-label="Navegação principal">{destinos.map(([url, nome]) => <NavLink key={url} to={url === '/app' && !autenticado ? '/' : url} className={pathname === url ? 'ativo' : ''}>{nome}</NavLink>)}</nav>
    </header>
    <div className="portal-faixa">SUA APROVAÇÃO COMEÇA COM UM PLANO <span>Um passo por dia, mais perto do seu objetivo.</span></div>
    {publico && <div className="portal-apresentacao"><span className="sobretitulo">PREPARE O SEU FUTURO</span><h2>Grandes conquistas.<br /><strong>Um estudo de cada vez.</strong></h2><p>Organize seu edital, pratique questões e acompanhe cada avanço na sua preparação.</p><div className="portal-pilares"><span>01 · Planeje</span><span>02 · Pratique</span><span>03 · Evolua</span></div></div>}
    <div id="conteudo" className="portal-conteudo">{children}</div>
    <footer className="portal-rodape"><strong>ESTUDA.</strong><span>Planejamento, prática e evolução em um só lugar.</span><span>Plataforma de estudos</span></footer>
  </div>
}
