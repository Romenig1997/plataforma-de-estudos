import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { MENSAGEM_SESSAO_EXPIRADA } from './api'
import { usePopover } from './componentes/usePopover'
import { buscarFoto } from './fotoPerfil'
import { perfilDoToken, SessaoEncerrada } from './sessao'

type Props = {
  token: string
  onEncerrarSessao: (motivo?: string) => void
}

export default function MenuDaConta({ token, onEncerrarSessao }: Props) {
  const { aberto, setAberto, container } = usePopover()
  const [foto, setFoto] = useState<string | null>(null)
  const administrador = perfilDoToken(token) === 'ADMIN'

  useEffect(() => {
    let cancelado = false
    let url: string | null = null

    buscarFoto(token)
      .then((arquivo) => {
        if (cancelado || !arquivo) return
        url = URL.createObjectURL(arquivo)
        setFoto(url)
      })
      .catch((erro: unknown) => {
        if (!cancelado && erro instanceof SessaoEncerrada) {
          onEncerrarSessao(MENSAGEM_SESSAO_EXPIRADA)
        }
      })

    return () => {
      cancelado = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [token, onEncerrarSessao])

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
