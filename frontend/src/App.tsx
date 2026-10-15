import { useCallback, useState, type ReactNode } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import TelaAdmin from './TelaAdmin'
import TelaAutenticada from './TelaAutenticada'
import TelaCadastro from './TelaCadastro'
import TelaImportarEdital from './TelaImportarEdital'
import TelaLogin from './TelaLogin'
import TelaPerfil from './TelaPerfil'
import TelaPlanner from './TelaPlanner'
import TelaCronograma from './TelaCronograma'
import TelaDashboard from './TelaDashboard'
import TelaAnalise from './TelaAnalise'
import TelaQuestoes from './TelaQuestoes'
import TelaAdminQuestoes from './TelaAdminQuestoes'
import { descartarToken, guardarToken, lerToken } from './sessao'
import './App.css'
import EstruturaVisual from './EstruturaVisual'
import TelaInicio from './TelaInicio'
import TelaEsqueciSenha from './TelaEsqueciSenha'
import TelaRedefinirSenha from './TelaRedefinirSenha'
import TelaConfirmarEmail from './TelaConfirmarEmail'
import TelaSeguranca from './TelaSeguranca'
import TelaCurso from './TelaCurso'

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

  const atualizarToken = useCallback((novoToken: string) => {
    guardarToken(novoToken)
    setToken(novoToken)
  }, [])

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
    <EstruturaVisual autenticado={Boolean(token)} token={token} onEncerrarSessao={encerrarSessao}><Routes>
      <Route path="/" element={<TelaInicio />} />
      <Route path="/esqueci-senha" element={<TelaEsqueciSenha onVoltar={() => navigate('/login')} />} />
      <Route path="/redefinir-senha" element={<TelaRedefinirSenha onIrParaLogin={() => navigate('/login')} />} />
      <Route path="/confirmar-email" element={<TelaConfirmarEmail onIrParaLogin={() => navigate('/login')} />} />
      <Route path="/questoes" element={<RotaProtegida token={token}><TelaQuestoes token={token!} onEncerrarSessao={encerrarSessao} onVoltar={() => navigate('/app')} onIrParaDashboard={() => navigate('/dashboard')} /></RotaProtegida>} />
      <Route path="/admin/questoes" element={<RotaProtegida token={token}><TelaAdminQuestoes token={token!} onEncerrarSessao={encerrarSessao} onVoltar={() => navigate('/admin')} /></RotaProtegida>} />
      <Route path="/analise" element={<RotaProtegida token={token}><TelaAnalise token={token!} onEncerrarSessao={encerrarSessao} onVoltar={() => navigate('/app')} onIrParaDashboard={() => navigate('/dashboard')} /></RotaProtegida>} />
      <Route path="/dashboard" element={<RotaProtegida token={token}><TelaDashboard token={token!} onEncerrarSessao={encerrarSessao} onVoltar={() => navigate('/app')} onIrParaPlanner={() => navigate('/planner')} onIrParaCronograma={() => navigate('/cronograma')} /></RotaProtegida>} />
      <Route path="/cronograma" element={<RotaProtegida token={token}><TelaCronograma token={token!} onEncerrarSessao={encerrarSessao} onVoltar={() => navigate('/app')} onIrParaPlanner={() => navigate('/planner')} /></RotaProtegida>} />
      <Route path="/seguranca" element={<RotaProtegida token={token}><TelaSeguranca token={token!} onNovoToken={atualizarToken} onEncerrarSessao={encerrarSessao} onVoltar={() => navigate('/perfil')} /></RotaProtegida>} />
      <Route path="/planner" element={<RotaProtegida token={token}><TelaPlanner token={token!} onEncerrarSessao={encerrarSessao} onVoltar={() => navigate('/app')} onIrParaCronograma={() => navigate('/cronograma')} /></RotaProtegida>} />
      <Route path="/curso/:editalId" element={<RotaProtegida token={token}><TelaCurso token={token!} onEncerrarSessao={encerrarSessao} /></RotaProtegida>} />
      <Route
        path="/login"
        element={
          <TelaLogin
            onAutenticado={autenticar}
            onIrParaCadastro={() => navigate('/cadastro')}
            onIrParaRecuperacao={() => navigate('/esqueci-senha')}
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
              onIrParaQuestoes={() => navigate('/admin/questoes')}
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
    </Routes></EstruturaVisual>
  )
}

export default App
