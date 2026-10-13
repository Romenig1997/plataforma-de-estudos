import { useCallback, useState, type ReactNode } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import TelaAdmin from './TelaAdmin'
import TelaAutenticada from './TelaAutenticada'
import TelaCadastro from './TelaCadastro'
import TelaImportarEdital from './TelaImportarEdital'
import TelaLogin from './TelaLogin'
import TelaPerfil from './TelaPerfil'
import { descartarToken, lerToken } from './sessao'
import './App.css'

/**
 * Rota que so renderiza o conteudo autenticado quando ha token. Sem token,
 * redireciona para o login. Usado em `/app`, `/perfil` e `/admin`.
 */
function RotaProtegida({ token, children }: { token: string | null; children: ReactNode }) {
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return children
}

/**
 * Casca da aplicacao (HU02, com router da HU06).
 *
 * <p>As telas publicas e autenticadas sao rotas (`/login`, `/cadastro`, `/app`,
 * `/perfil`, `/admin`). A navegacao por estado das HUs 02-04 virou router, mas
 * o comportamento testado se manteve: o token mora no `sessionStorage`, o F5
 * nao encerra a sessao enquanto a aba estiver aberta, e uma rota autenticada
 * sem token termina no login.
 */
function App() {
  const [token, setToken] = useState<string | null>(lerToken)
  const [aviso, setAviso] = useState<string | null>(null)
  const navigate = useNavigate()

  const autenticar = useCallback(
    (novoToken: string) => {
      setToken(novoToken)
      setAviso(null)
      navigate('/app')
    },
    [navigate],
  )

  /**
   * Logout. Descartar o token e o que "encerra a sessao": com ele fora do
   * navegador, nenhuma rota autenticada renderiza e nenhuma requisicao leva
   * mais o cabecalho Authorization.
   */
  const encerrarSessao = useCallback(
    (motivo?: string) => {
      descartarToken()
      setToken(null)
      setAviso(motivo ?? null)
      navigate('/login')
    },
    [navigate],
  )

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <TelaLogin
            onAutenticado={autenticar}
            onIrParaCadastro={() => navigate('/cadastro')}
            aviso={aviso}
          />
        }
      />
      <Route
        path="/cadastro"
        element={<TelaCadastro onIrParaLogin={() => navigate('/login')} />}
      />
      <Route
        path="/app"
        element={
          <RotaProtegida token={token}>
            <TelaAutenticada token={token!} onEncerrarSessao={encerrarSessao} />
          </RotaProtegida>
        }
      />
      <Route
        path="/perfil"
        element={
          <RotaProtegida token={token}>
            <TelaPerfil
              token={token!}
              onEncerrarSessao={encerrarSessao}
              onVoltar={() => navigate('/app')}
            />
          </RotaProtegida>
        }
      />
      <Route
        path="/admin"
        element={
          <RotaProtegida token={token}>
            <TelaAdmin
              token={token!}
              onEncerrarSessao={encerrarSessao}
              onVoltar={() => navigate('/app')}
              onIrParaEditais={() => navigate('/admin/editais')}
            />
          </RotaProtegida>
        }
      />
      <Route
        path="/admin/editais"
        element={
          <RotaProtegida token={token}>
            <TelaImportarEdital
              token={token!}
              onEncerrarSessao={encerrarSessao}
              onVoltar={() => navigate('/admin')}
            />
          </RotaProtegida>
        }
      />
      <Route
        path="*"
        element={token ? <Navigate to="/app" replace /> : <Navigate to="/login" replace />}
      />
    </Routes>
  )
}

export default App