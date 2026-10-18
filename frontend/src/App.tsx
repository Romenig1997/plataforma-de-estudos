import { useCallback, lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { buscarSessaoAtual, SessaoEncerrada, type Usuario } from './sessao'
import { observarSessao, sair } from './autenticacao'
import { SessaoContexto } from './contextoDaSessao'
import { MENSAGEM_SESSAO_EXPIRADA } from './api'

const TelaAdmin = lazy(() => import('./TelaAdmin'))
const TelaAdminAlunos = lazy(() => import('./TelaAdminAlunos'))
const TelaAdminCursos = lazy(() => import('./TelaAdminCursos'))
const TelaAutenticada = lazy(() => import('./TelaAutenticada'))
const TelaCadastro = lazy(() => import('./TelaCadastro'))
const TelaImportarEdital = lazy(() => import('./TelaImportarEdital'))
const TelaPerfil = lazy(() => import('./TelaPerfil'))
const TelaPlanner = lazy(() => import('./TelaPlanner'))
const TelaCronograma = lazy(() => import('./TelaCronograma'))
const TelaDashboard = lazy(() => import('./TelaDashboard'))
const TelaQuestoes = lazy(() => import('./TelaQuestoes'))
const TelaAdminQuestoes = lazy(() => import('./TelaAdminQuestoes'))
const TelaCurso = lazy(() => import('./TelaCurso'))

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

/** /analise?curso=1 vira /dashboard?curso=1. */
function RedirecionarParaDesempenho() {
  const { search } = useLocation()
  return <Navigate to={`/dashboard${search}`} replace />
}

/** Estado de navegacao que o login usa para devolver o aluno aonde ele ia. */
type EstadoDeRetorno = { de?: string } | null

const CARREGANDO_SESSAO = <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8"><EstadoCarregando formato="pagina">Verificando sua sessão…</EstadoCarregando></main>

/**
 * Layout das rotas autenticadas. Enquanto a sessao guardada e conferida,
 * mostra o carregamento; sem sessao, manda para o login guardando o destino.
 */
function RotaProtegida({ token, verificando }: { token: string | null; verificando: boolean }) {
  const local = useLocation()
  if (verificando) return CARREGANDO_SESSAO
  if (!token) {
    return <Navigate to="/login" replace state={{ de: `${local.pathname}${local.search}` }} />
  }
  return <Outlet />
}

/**
 * Rotas da area administrativa: so abrem quando o perfil da sessao e ADMIN.
 * ALUNO ve a pagina de acesso negado. O backend continua sendo quem autoriza
 * de verdade (403).
 */
function RotaAdmin({ usuario }: { usuario: Usuario | null }) {
  if (!usuario) return CARREGANDO_SESSAO
  if (usuario.perfil !== 'ADMIN') {
    return (
      <TelaNaoEncontrada
        titulo="Acesso negado"
        mensagem="Esta área é exclusiva para administradores da plataforma. Sua conta de aluno continua com acesso aos cursos, ao planner e ao desempenho."
        autenticado
      />
    )
  }
  return <Outlet />
}

/**
 * Casca da aplicacao.
 *
 * <p>A sessao e do Supabase Auth: ela sobrevive ao F5, o token e renovado
 * automaticamente e o logout encerra a sessao no Supabase. O perfil (papel e
 * foto) vem de `GET /api/auth/me`.
 */
function App() {
  const [token, setToken] = useState<string | null>(null)
  const [verificando, setVerificando] = useState(true)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const navigate = useNavigate()
  const local = useLocation()
  const destinoAposLogin = (local.state as EstadoDeRetorno)?.de

  /** Logout: encerra a sessao no Supabase, limpa o estado e volta ao login. */
  const encerrarSessao = useCallback(
    (motivo?: string) => {
      void sair()
      setToken(null)
      setUsuario(null)
      setAviso(motivo ?? null)
      navigate('/login')
    },
    [navigate],
  )

  useEffect(
    () =>
      observarSessao((novoToken, evento) => {
        // No login quem abre a sessao e a tela de login, depois de carregar o
        // perfil. Aqui so se troca o token de uma sessao ja aberta (ex.: a
        // conferencia da senha atual na tela de seguranca).
        if (evento === 'entrou') {
          setToken((atual) => (atual && novoToken ? novoToken : atual))
          return
        }
        setToken(novoToken)
        if (!novoToken) setUsuario(null)
        if (evento === 'inicial') setVerificando(false)
        // O link de redefinicao abre uma sessao temporaria so para trocar a senha.
        if (evento === 'recuperacao') navigate('/redefinir-senha', { replace: true })
      }),
    [navigate],
  )

  // Perfil da sessao restaurada (F5 ou outra aba). O login ja traz o perfil.
  const precisaDoPerfil = Boolean(token) && !usuario
  useEffect(() => {
    if (!precisaDoPerfil || !token) return
    let cancelado = false
    buscarSessaoAtual(token)
      .then((dados) => { if (!cancelado) setUsuario(dados) })
      .catch((erro: unknown) => {
        if (!cancelado && erro instanceof SessaoEncerrada) encerrarSessao(MENSAGEM_SESSAO_EXPIRADA)
      })
    return () => { cancelado = true }
  }, [precisaDoPerfil, token, encerrarSessao])

  const autenticar = useCallback(
    (novoToken: string, dados: Usuario) => {
      setToken(novoToken)
      setUsuario(dados)
      setAviso(null)
      // Sem destino guardado, o admin abre o painel de gestao e o aluno, os cursos.
      const inicio = dados.perfil === 'ADMIN' ? '/admin' : '/app'
      navigate(destinoAposLogin && destinoAposLogin !== '/login' ? destinoAposLogin : inicio, { replace: true })
    },
    [navigate, destinoAposLogin],
  )

  const atualizarUsuario = useCallback((dados: Partial<Usuario>) => {
    setUsuario((atual) => (atual ? { ...atual, ...dados } : atual))
  }, [])
  const contexto = useMemo(() => ({ usuario, atualizarUsuario }), [usuario, atualizarUsuario])

  const irParaLogin = useCallback(() => navigate('/login'), [navigate])
  // Dentro de RotaProtegida o token sempre existe.
  const t = token ?? ''

  return (
    <SessaoContexto.Provider value={contexto}>
      <EstruturaVisual autenticado={Boolean(token)} token={token} onEncerrarSessao={encerrarSessao}>
        <ErrorBoundary chave={local.pathname}>
          <Suspense fallback={<main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8"><EstadoCarregando formato="pagina">Carregando…</EstadoCarregando></main>}>
            <Routes>
              <Route path="/" element={<TelaInicio autenticado={Boolean(token)} />} />
              <Route path="/esqueci-senha" element={<TelaEsqueciSenha onVoltar={irParaLogin} />} />
              <Route path="/redefinir-senha" element={<TelaRedefinirSenha onIrParaLogin={irParaLogin} />} />
              <Route path="/confirmar-email" element={<TelaConfirmarEmail token={token} verificando={verificando} onIrParaLogin={irParaLogin} />} />
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
              <Route path="/cadastro" element={<TelaCadastro onIrParaLogin={irParaLogin} onAutenticado={autenticar} />} />

              <Route element={<RotaProtegida token={token} verificando={verificando} />}>
                <Route path="/app" element={<TelaAutenticada token={t} onEncerrarSessao={encerrarSessao} />} />
                <Route path="/curso/:editalId" element={<TelaCurso token={t} onEncerrarSessao={encerrarSessao} />} />
                <Route path="/questoes" element={<TelaQuestoes token={t} onEncerrarSessao={encerrarSessao} />} />
                <Route path="/dashboard" element={<TelaDashboard token={t} onEncerrarSessao={encerrarSessao} />} />
                {/* A analise agora faz parte do Desempenho; o endereco antigo continua funcionando. */}
                <Route path="/analise" element={<RedirecionarParaDesempenho />} />
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
                  element={<TelaSeguranca onEncerrarSessao={encerrarSessao} onVoltar={() => navigate('/perfil')} />}
                />
                <Route element={<RotaAdmin usuario={usuario} />}>
                  <Route path="/admin" element={<TelaAdmin token={t} onEncerrarSessao={encerrarSessao} />} />
                  <Route path="/admin/alunos" element={<TelaAdminAlunos token={t} onEncerrarSessao={encerrarSessao} />} />
                  <Route path="/admin/cursos" element={<TelaAdminCursos token={t} onEncerrarSessao={encerrarSessao} />} />
                  <Route path="/admin/editais" element={<TelaImportarEdital token={t} onEncerrarSessao={encerrarSessao} onVoltar={() => navigate('/admin')} />} />
                  <Route path="/admin/questoes" element={<TelaAdminQuestoes token={t} onEncerrarSessao={encerrarSessao} onVoltar={() => navigate('/admin')} />} />
                </Route>
              </Route>

              <Route path="*" element={<TelaNaoEncontrada autenticado={Boolean(token)} />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </EstruturaVisual>
    </SessaoContexto.Provider>
  )
}

export default App
