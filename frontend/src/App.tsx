import { useCallback, lazy, Suspense, useState } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { descartarToken, guardarToken, lerToken, perfilDoToken } from './sessao'

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
import EstadoCarregando from './componentes/EstadoCarregando'
import EstruturaVisual from './EstruturaVisual'
import TelaLogin from './TelaLogin'
import TelaInicio from './TelaInicio'
import TelaEsqueciSenha from './TelaEsqueciSenha'
import TelaRedefinirSenha from './TelaRedefinirSenha'
import TelaConfirmarEmail from './TelaConfirmarEmail'
import TelaSeguranca from './TelaSeguranca'
import TelaNaoEncontrada from './TelaNaoEncontrada'

/** Estado de navegacao que o login usa para devolver o aluno aonde ele ia. */
type EstadoDeRetorno = { de?: string } | null

/**
 * Layout das rotas autenticadas. Sem token, manda para o login guardando o
 * destino, para que o aluno volte a ele depois de entrar.
 */
function RotaProtegida({ token }: { token: string | null }) {
  const local = useLocation()
  if (!token) {
    return <Navigate to="/login" replace state={{ de: `${local.pathname}${local.search}` }} />
  }
  return <Outlet />
}

/**
 * Rotas da area administrativa. Quando o token diz que a conta e de ALUNO, a
 * tela explica a restricao em vez de abrir e falhar na API. Token ilegivel
 * segue para a tela, e o backend decide (403).
 */
function RotaAdmin({ token }: { token: string | null }) {
  if (token && perfilDoToken(token) === 'ALUNO') {
    return (
      <TelaNaoEncontrada
        titulo="Acesso restrito"
        mensagem="Esta área é exclusiva para administradores da plataforma."
        autenticado
      />
    )
  }
  return <Outlet />
}

/**
 * Casca da aplicacao (HU02, com router da HU06).
 *
 * <p>O token mora no `sessionStorage`: o F5 nao encerra a sessao enquanto a
 * aba estiver aberta, e uma rota autenticada sem token termina no login.
 */
function App() {
  const [token, setToken] = useState<string | null>(lerToken)
  const [aviso, setAviso] = useState<string | null>(null)
  const navigate = useNavigate()
  const local = useLocation()
  const destinoAposLogin = (local.state as EstadoDeRetorno)?.de

  const autenticar = useCallback(
    (novoToken: string) => {
      setToken(novoToken)
      setAviso(null)
      navigate(destinoAposLogin && destinoAposLogin !== '/login' ? destinoAposLogin : '/app', { replace: true })
    },
    [navigate, destinoAposLogin],
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

  const irParaLogin = useCallback(() => navigate('/login'), [navigate])
  // Dentro de RotaProtegida o token sempre existe.
  const t = token ?? ''

  return (
    <EstruturaVisual autenticado={Boolean(token)} token={token} onEncerrarSessao={encerrarSessao}>
      <ErrorBoundary chave={local.pathname}>
        <Suspense fallback={<main className="tela"><EstadoCarregando>Carregando…</EstadoCarregando></main>}>
          <Routes>
            <Route path="/" element={<TelaInicio autenticado={Boolean(token)} />} />
            <Route path="/esqueci-senha" element={<TelaEsqueciSenha onVoltar={irParaLogin} />} />
            <Route path="/redefinir-senha" element={<TelaRedefinirSenha onIrParaLogin={irParaLogin} />} />
            <Route path="/confirmar-email" element={<TelaConfirmarEmail onIrParaLogin={irParaLogin} />} />
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
            <Route path="/cadastro" element={<TelaCadastro onIrParaLogin={irParaLogin} />} />

            <Route element={<RotaProtegida token={token} />}>
              <Route path="/app" element={<TelaAutenticada token={t} onEncerrarSessao={encerrarSessao} />} />
              <Route path="/curso/:editalId" element={<TelaCurso token={t} onEncerrarSessao={encerrarSessao} />} />
              <Route path="/questoes" element={<TelaQuestoes token={t} onEncerrarSessao={encerrarSessao} />} />
              <Route path="/dashboard" element={<TelaDashboard token={t} onEncerrarSessao={encerrarSessao} />} />
              <Route path="/analise" element={<TelaAnalise token={t} onEncerrarSessao={encerrarSessao} />} />
              <Route
                path="/planner"
                element={<TelaPlanner token={t} onEncerrarSessao={encerrarSessao} />}
              />
              <Route
                path="/cronograma"
                element={<TelaCronograma token={t} onEncerrarSessao={encerrarSessao} onIrParaPlanner={() => navigate('/planner')} />}
              />
              <Route path="/perfil" element={<TelaPerfil token={t} onEncerrarSessao={encerrarSessao} onVoltar={() => navigate('/app')} />} />
              <Route
                path="/seguranca"
                element={<TelaSeguranca token={t} onNovoToken={atualizarToken} onEncerrarSessao={encerrarSessao} onVoltar={() => navigate('/perfil')} />}
              />
              <Route element={<RotaAdmin token={token} />}>
                <Route
                  path="/admin"
                  element={
                    <TelaAdmin
                      token={t}
                      onEncerrarSessao={encerrarSessao}
                      onVoltar={() => navigate('/app')}
                      onIrParaEditais={() => navigate('/admin/editais')}
                      onIrParaQuestoes={() => navigate('/admin/questoes')}
                    />
                  }
                />
                <Route path="/admin/editais" element={<TelaImportarEdital token={t} onEncerrarSessao={encerrarSessao} onVoltar={() => navigate('/admin')} />} />
                <Route path="/admin/questoes" element={<TelaAdminQuestoes token={t} onEncerrarSessao={encerrarSessao} onVoltar={() => navigate('/admin')} />} />
              </Route>
            </Route>

            <Route path="*" element={<TelaNaoEncontrada autenticado={Boolean(token)} />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </EstruturaVisual>
  )
}

export default App
