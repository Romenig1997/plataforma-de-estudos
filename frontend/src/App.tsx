import { useCallback, useState } from 'react'
import TelaAutenticada from './TelaAutenticada'
import TelaCadastro from './TelaCadastro'
import TelaLogin from './TelaLogin'
import { descartarToken, lerToken } from './sessao'
import './App.css'

type TelaPublica = 'login' | 'cadastro'

/**
 * Casca da aplicacao (HU02).
 *
 * <p>Escolhe qual das tres telas mostrar. Nao ha router: a navegacao e por
 * estado, como manda a arquitetura — o router entra na HU06, junto com o
 * design system. Sao tres telas, uma por vez, e a area autenticada so aparece
 * quando ha token.
 *
 * <p>O token e lido do `sessionStorage` na primeira renderizacao, entao o F5
 * nao encerra a sessao enquanto a aba estiver aberta.
 */
function App() {
  const [tela, setTela] = useState<TelaPublica>('login')
  const [token, setToken] = useState<string | null>(lerToken)
  const [aviso, setAviso] = useState<string | null>(null)

  const autenticar = useCallback((novoToken: string) => {
    setToken(novoToken)
    setAviso(null)
  }, [])

  /**
   * Logout. Descartar o token e o que "encerra a sessao": com ele fora do
   * navegador, a area autenticada deixa de renderizar e nenhuma requisicao
   * leva mais o cabecalho Authorization.
   */
  const encerrarSessao = useCallback((motivo?: string) => {
    descartarToken()
    setToken(null)
    setTela('login')
    setAviso(motivo ?? null)
  }, [])

  const irParaCadastro = useCallback(() => {
    setAviso(null)
    setTela('cadastro')
  }, [])

  const irParaLogin = useCallback(() => {
    setAviso(null)
    setTela('login')
  }, [])

  if (token) {
    return <TelaAutenticada token={token} onEncerrarSessao={encerrarSessao} />
  }

  if (tela === 'cadastro') {
    return <TelaCadastro onIrParaLogin={irParaLogin} />
  }

  return (
    <TelaLogin onAutenticado={autenticar} onIrParaCadastro={irParaCadastro} aviso={aviso} />
  )
}

export default App