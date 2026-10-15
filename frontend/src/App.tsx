import { useCallback, lazy, Suspense, useState, type ReactNode } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { descartarToken, guardarToken, lerToken } from './sessao'

const TelaAdmin = lazy(() => import('./TelaAdmin'))
const TelaAutenticada = lazy(() => import('./TelaAutenticada'))
const TelaCadastro = lazy(() => import('./TelaCadastro'))
const TelaImportarEdital = lazy(() => import('./TelaImportarEdital'))
const TelaPerfil = lazy(() => import('./TelaPerfil'))
const TelaPlanner = lazy(() => import('./TelaPlanner'))
const TelaCronograma = lazy(() => import('./TelaCronograma'))
const TelaDashboard = lazy(() => import('./TelaDashboard'))
const TelaAnalise = lazy(() => import('./TelaAnalise'))
const TelaQuestoes = lazy(() => import('./TelaQuestoes'))
const TelaAdminQuestoes = lazy(() => import('./TelaAdminQuestoes'))
const TelaCurso = lazy(() => import('./TelaCurso'))

import './App.css'
import ErrorBoundary from './componentes/ErrorBoundary'
import EstruturaVisual from './EstruturaVisual'
import TelaLogin from './TelaLogin'
import TelaInicio from './TelaInicio'
import TelaEsqueciSenha from './TelaEsqueciSenha'
import TelaRedefinirSenha from './TelaRedefinirSenha'
import TelaConfirmarEmail from './TelaConfirmarEmail'
import TelaSeguranca from './TelaSeguranca'

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
    <ErrorBoundary><EstruturaVisual autenticado={Boolean(token)} token={token} onEncerrarSessao={encerrarSessao}><Suspense fallback={<p role="status" aria-live="polite" className="carregando">Carregando…</p>}><Routes>
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
    </Routes></Suspense></EstruturaVisual></ErrorBoundary>
  )
}

export default App
