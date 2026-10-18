import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { instalarFetch, respostaJson } from './testes/ajuda'

/**
 * Supabase Auth simulado: guarda a sessao em memoria e avisa os ouvintes como
 * o `onAuthStateChange` real. A senha valida e `senha1234`.
 */
const auth = vi.hoisted(() => {
  const estado = { sessao: null as string | null, tokenDoLogin: 'token-do-supabase' }
  const ouvintes = new Set<(token: string | null, evento: string) => void>()
  const emitir = (evento: string) => ouvintes.forEach((ouvinte) => ouvinte(estado.sessao, evento))
  return {
    estado,
    entrar: vi.fn(async (_email: string, senha: string) => {
      if (senha !== 'senha1234') {
        const { ErroDeAutenticacao } = await vi.importActual<typeof import('./autenticacao')>('./autenticacao')
        throw new ErroDeAutenticacao('E-mail ou senha inválidos.', 'geral', 'invalid_credentials')
      }
      estado.sessao = estado.tokenDoLogin
      emitir('entrou')
      return estado.sessao
    }),
    sair: vi.fn(async () => {
      estado.sessao = null
      emitir('saiu')
    }),
    observarSessao: vi.fn((aoMudar: (token: string | null, evento: string) => void) => {
      ouvintes.add(aoMudar)
      aoMudar(estado.sessao, 'inicial')
      return () => { ouvintes.delete(aoMudar) }
    }),
  }
})

vi.mock('./autenticacao', async (original) => ({
  ...(await original<typeof import('./autenticacao')>()),
  entrar: auth.entrar,
  sair: auth.sair,
  observarSessao: auth.observarSessao,
}))

/**
 * Monta a casca dentro do router de teste (HU06). Cada montagem parte da
 * área do aluno (`/app`), que sem sessao redireciona para o login.
 */
function renderizarApp(inicio = '/app') {
  return render(
    <MemoryRouter initialEntries={[inicio]}>
      <App />
    </MemoryRouter>,
  )
}

/**
 * Criterios de aceite do fluxo de autenticacao no navegador (HU02 e HU04):
 * entrar pelo Supabase Auth, carregar o perfil da API, separar aluno e
 * administrador, sair e tentar usar a area depois de sair.
 */
describe('App - autenticacao', () => {
  const USUARIO = { id: 7, nome: 'Ana Souza', email: 'ana@email.com', perfil: 'ALUNO' as const, avatarUrl: null }
  const USUARIO_ADMIN = { ...USUARIO, perfil: 'ADMIN' as const }
  const TOKEN_ALUNO = 'token-do-supabase-aluno'
  const TOKEN_ADMIN = 'token-do-supabase-admin'

  const RESUMO_ADMIN = {
    totalAlunos: 1, totalAdministradores: 1, novosAlunos30Dias: 1, contasSemConfirmacao: 0, cursosPublicados: 0,
    editaisAguardandoRevisao: 0, questoesPublicadas: 0, questoesEmRascunho: 0, cursos: [], cadastrosRecentes: [],
  }

  beforeEach(() => {
    auth.estado.sessao = null
    auth.estado.tokenDoLogin = TOKEN_ALUNO
    auth.entrar.mockClear()
    auth.sair.mockClear()
  })

  /** API com o recurso protegido exigindo o access token no cabecalho. */
  function instalarBackend() {
    return instalarFetch(({ url, init }) => {
      const cabecalho = new Headers(init?.headers).get('Authorization')
      if (url === '/api/auth/me') {
        if (cabecalho === `Bearer ${TOKEN_ALUNO}`) return respostaJson(200, USUARIO)
        if (cabecalho === `Bearer ${TOKEN_ADMIN}`) return respostaJson(200, USUARIO_ADMIN)
        return respostaJson(401, { erros: [{ campo: 'autenticacao', mensagem: 'Faca login para acessar este recurso.' }] })
      }
      if (url === '/api/editais') return respostaJson(200, [])
      if (url === '/api/cursos/inscricoes') return respostaJson(200, [])
      if (url === '/api/planner') return new Response(null, { status: 204 })
      if (url.startsWith('/api/dashboard')) return new Response(null, { status: 204 })
      if (url === '/api/admin/usuarios') {
        return respostaJson(200, [
          { id: 7, nome: 'Ana Souza', email: 'ana@email.com', perfil: 'ADMIN', emailVerificado: true },
          { id: 9, nome: 'Bruno Lima', email: 'bruno@email.com', perfil: 'ALUNO', emailVerificado: true },
        ])
      }
      if (url === '/api/admin/resumo') return respostaJson(200, RESUMO_ADMIN)
      if (url === '/api/admin/editais/importacoes') return respostaJson(200, [])
      throw new Error(`URL inesperada no teste: ${url}`)
    })
  }

  async function entrarNaPlataforma(senha = 'senha1234') {
    const usuario = userEvent.setup()
    await usuario.type(screen.getByLabelText('E-mail'), 'ana@email.com')
    await usuario.type(screen.getByLabelText('Senha'), senha)
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }))
  }

  async function sairPeloMenu() {
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu da conta' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Sair' }))
    await screen.findByRole('heading', { name: 'Entrar na plataforma' })
  }

  // -----------------------------------------------------------------------
  // Rotas privadas exigem autenticacao
  // -----------------------------------------------------------------------
  it('rota do cronograma sem sessao redireciona ao login', () => {
    renderizarApp('/cronograma')
    expect(screen.getByRole('heading', { name: 'Entrar na plataforma' })).toBeInTheDocument()
  })

  it('rota do planner sem sessao redireciona ao login', () => {
    renderizarApp('/planner')
    expect(screen.getByRole('heading', { name: 'Entrar na plataforma' })).toBeInTheDocument()
  })

  it('comeca na tela de login quando nao ha sessao guardada', () => {
    instalarBackend()
    renderizarApp()
    expect(screen.getByRole('heading', { name: 'Entrar na plataforma' })).toBeInTheDocument()
  })

  // -----------------------------------------------------------------------
  // Login
  // -----------------------------------------------------------------------
  it('apos o login valido mostra a area autenticada com os dados do usuario', async () => {
    const fetchFalso = instalarBackend()

    renderizarApp()
    await entrarNaPlataforma()

    expect(await screen.findByRole('heading', { name: 'Meus cursos' })).toBeInTheDocument()
    expect(await screen.findByText(/Olá, Ana/)).toBeInTheDocument()
    expect(auth.entrar).toHaveBeenCalledWith('ana@email.com', 'senha1234')

    // O perfil foi lido com o access token do Supabase no cabecalho.
    const chamadasProMe = fetchFalso.mock.calls.filter((chamada) => String(chamada[0]) === '/api/auth/me')
    expect(chamadasProMe.length).toBeGreaterThan(0)
    for (const [, init] of chamadasProMe) {
      expect(new Headers(init?.headers).get('Authorization')).toBe(`Bearer ${TOKEN_ALUNO}`)
    }
  })

  it('nao mostra a area autenticada quando as credenciais sao recusadas', async () => {
    instalarBackend()

    renderizarApp()
    await entrarNaPlataforma('senha-errada')

    expect(await screen.findByText('E-mail ou senha inválidos.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Meus cursos' })).not.toBeInTheDocument()
    expect(auth.estado.sessao).toBeNull()
  })

  it('depois do login volta para a pagina protegida que o aluno tentou abrir', async () => {
    const fetchFalso = instalarBackend()

    renderizarApp('/dashboard')
    await entrarNaPlataforma()

    expect(await screen.findByRole('heading', { name: 'Desempenho' })).toBeInTheDocument()
    expect(fetchFalso.mock.calls.some((chamada) => String(chamada[0]).startsWith('/api/dashboard'))).toBe(true)
  })

  it('mantem a sessao quando a pagina recarrega com a sessao guardada no Supabase', async () => {
    auth.estado.sessao = TOKEN_ALUNO
    instalarBackend()

    renderizarApp()

    expect(await screen.findByRole('heading', { name: 'Meus cursos' })).toBeInTheDocument()
  })

  it('volta para o login com aviso quando o token deixa de ser aceito', async () => {
    auth.estado.sessao = 'token-que-o-backend-nao-aceita'
    instalarBackend()

    renderizarApp()

    expect(await screen.findByRole('heading', { name: 'Entrar na plataforma' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Sua sessão expirou. Faça login novamente.')
    expect(auth.sair).toHaveBeenCalled()
  })

  // -----------------------------------------------------------------------
  // HU04 - Perfis de Acesso Diferenciados
  // -----------------------------------------------------------------------
  it('ALUNO nao ve o botao da area admin', async () => {
    instalarBackend()

    renderizarApp()
    await entrarNaPlataforma()

    await screen.findByRole('heading', { name: 'Meus cursos' })
    expect(screen.queryByRole('link', { name: 'Área administrativa' })).not.toBeInTheDocument()
  })

  it('conta de ALUNO ve a pagina de acesso negado na area admin', async () => {
    auth.estado.sessao = TOKEN_ALUNO
    instalarBackend()

    renderizarApp('/admin')

    expect(await screen.findByRole('heading', { name: 'Acesso negado' })).toBeInTheDocument()
    // O aluno fica na propria casca: nada da navegacao do painel aparece.
    expect(screen.queryByRole('complementary', { name: 'Navegação administrativa' })).not.toBeInTheDocument()
  })

  it('ADMIN entra no painel de gestao, com navegacao propria, e lista os alunos', async () => {
    auth.estado.tokenDoLogin = TOKEN_ADMIN
    instalarBackend()

    renderizarApp('/login')
    await entrarNaPlataforma()

    expect(await screen.findByRole('heading', { name: 'Visão geral' })).toBeInTheDocument()
    const navegacao = screen.getByRole('complementary', { name: 'Navegação administrativa' })
    expect(screen.queryByRole('complementary', { name: 'Navegação principal' })).not.toBeInTheDocument()

    await userEvent.click(within(navegacao).getByRole('link', { name: 'Gestão de alunos' }))
    expect(await screen.findByRole('heading', { name: 'Gestão de alunos' })).toBeInTheDocument()
    expect(await screen.findByText('Bruno Lima')).toBeInTheDocument()
    expect(screen.getByText('bruno@email.com')).toBeInTheDocument()
  })

  it('ADMIN com sessao restaurada abre o painel direto', async () => {
    auth.estado.sessao = TOKEN_ADMIN
    instalarBackend()

    renderizarApp('/admin')

    expect(await screen.findByRole('heading', { name: 'Visão geral' })).toBeInTheDocument()
  })

  it('ADMIN volta para a area do aluno, que continua com a navegacao do aluno', async () => {
    auth.estado.tokenDoLogin = TOKEN_ADMIN
    instalarBackend()

    renderizarApp('/login')
    await entrarNaPlataforma()

    await screen.findByRole('heading', { name: 'Visão geral' })
    await userEvent.click(screen.getByRole('link', { name: 'Ver como aluno' }))

    expect(await screen.findByRole('heading', { name: 'Meus cursos' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Navegação principal' })).toBeInTheDocument()

    await userEvent.click(await screen.findByRole('link', { name: 'Área administrativa' }))
    expect(await screen.findByRole('heading', { name: 'Visão geral' })).toBeInTheDocument()
  })

  it('ADMIN abre a importacao de editais pela navegacao do painel e volta', async () => {
    auth.estado.tokenDoLogin = TOKEN_ADMIN
    instalarBackend()

    renderizarApp('/login')
    await entrarNaPlataforma()

    await screen.findByRole('heading', { name: 'Visão geral' })
    await userEvent.click(screen.getByRole('link', { name: 'Importar editais' }))
    expect(await screen.findByRole('heading', { name: 'Importar editais' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Navegação administrativa' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(await screen.findByRole('heading', { name: 'Visão geral' })).toBeInTheDocument()
  })

  // -----------------------------------------------------------------------
  // Logout
  // -----------------------------------------------------------------------
  it('o botao de sair encerra a sessao no Supabase e volta para a tela de login', async () => {
    instalarBackend()

    renderizarApp()
    await entrarNaPlataforma()
    await screen.findByRole('heading', { name: 'Meus cursos' })

    await sairPeloMenu()

    expect(auth.sair).toHaveBeenCalledOnce()
    expect(auth.estado.sessao).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Meus cursos' })).not.toBeInTheDocument()
  })

  it('depois do logout uma nova montagem comeca na tela de login', async () => {
    instalarBackend()

    const { unmount } = renderizarApp()
    await entrarNaPlataforma()
    await screen.findByRole('heading', { name: 'Meus cursos' })
    await sairPeloMenu()

    unmount()
    renderizarApp()

    expect(screen.getByRole('heading', { name: 'Entrar na plataforma' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Abrir menu da conta' })).not.toBeInTheDocument()
  })

  it('depois do logout nenhuma chamada autenticada sai sem passar pelo login', async () => {
    const fetchFalso = instalarBackend()

    renderizarApp()
    await entrarNaPlataforma()
    await screen.findByRole('heading', { name: 'Meus cursos' })
    const chamadasAntes = fetchFalso.mock.calls.length
    await sairPeloMenu()

    renderizarApp('/dashboard')
    expect(screen.getAllByRole('heading', { name: 'Entrar na plataforma' }).length).toBeGreaterThan(0)
    expect(fetchFalso.mock.calls.length).toBe(chamadasAntes)
  })

  // -----------------------------------------------------------------------
  // Outras rotas
  // -----------------------------------------------------------------------
  it('endereco inexistente mostra pagina com caminho de volta', () => {
    renderizarApp('/nao-existe')
    expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir para o início' })).toHaveAttribute('href', '/')
  })

  it('da para chegar ao cadastro e voltar para o login', async () => {
    instalarBackend()
    renderizarApp()

    await userEvent.click(screen.getByRole('button', { name: 'Cadastre-se' }))
    expect(await screen.findByRole('heading', { name: 'Cadastro de Usuário' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByRole('heading', { name: 'Entrar na plataforma' })).toBeInTheDocument()
  })
})
