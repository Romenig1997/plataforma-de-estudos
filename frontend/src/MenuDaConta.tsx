import { NavLink } from 'react-router-dom'
import { usePopover } from './componentes/usePopover'
import { useSessao } from './contextoDaSessao'

type Props = {
  onEncerrarSessao: (motivo?: string) => void
}

/**
 * Menu da conta no topo das telas autenticadas. A foto e o papel vem da
 * sessao (`GET /api/auth/me`); a foto e servida pelo Supabase Storage.
 */
export default function MenuDaConta({ onEncerrarSessao }: Props) {
  const { aberto, setAberto, container } = usePopover()
  const { usuario } = useSessao()
  const administrador = usuario?.perfil === 'ADMIN'
  const foto = usuario?.avatarUrl ?? null

  function sair() {
    setAberto(false)
    onEncerrarSessao()
  }

  return (
    <div className="menu-conta" ref={container}>
      <button
        type="button"
        className="menu-conta__gatilho"
        aria-label="Abrir menu da conta"
        aria-expanded={aberto}
        aria-haspopup="menu"
        aria-controls="menu-da-conta"
        onClick={() => setAberto((valor) => !valor)}
      >
        {foto ? (
          <img className="menu-conta__foto" src={foto} alt="" />
        ) : (
          <svg className="menu-conta__avatar" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c.7-4 3.5-6 8-6s7.3 2 8 6" />
          </svg>
        )}
      </button>

      {aberto && (
        <div id="menu-da-conta" className="menu-conta__opcoes" role="menu" aria-label="Opções da conta">
          <NavLink to="/perfil" role="menuitem" onClick={() => setAberto(false)}>Meu perfil</NavLink>
          <NavLink to="/seguranca" role="menuitem" onClick={() => setAberto(false)}>Segurança e configurações</NavLink>
          {administrador && (
            <NavLink to="/admin" role="menuitem" onClick={() => setAberto(false)}>Área administrativa</NavLink>
          )}
          <button type="button" role="menuitem" onClick={sair}>Sair</button>
        </div>
      )}
    </div>
  )
}
