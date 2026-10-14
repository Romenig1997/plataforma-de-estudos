import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import App from './App'
import { instalarFetch, respostaJson } from './testes/ajuda'

/**
 * Monta a casca dentro do router de teste (HU06). Cada montagem parte da
 * área do aluno (`/app`), que sem token redireciona para o login automaticamente.
 */
function renderizarApp() {
  return render(
    <MemoryRouter initialEntries={['/app']}>
      <App />
    </MemoryRouter>,
  )
}

/**
 * Criterios de aceite do fluxo de autenticacao no navegador (HU02):
 * entrar, ler a area autenticada, sair e tentar usar a area depois de sair.
 *
 * <p>O teste monta a casca real (`App`), e nao a tela isolada, porque e ela
 * que decide qual tela aparece e quem guarda o token.
 */
describe('App - autenticacao', () => {
  it('rota do cronograma sem sessao redireciona ao login', () => {
    render(<MemoryRouter initialEntries={['/cronograma']}><App /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Entrar na plataforma' })).toBeInTheDocument()
  })
  it('rota do planner sem sessao redireciona ao login', () => {
    render(<MemoryRouter initialEntries={['/planner']}><App /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Entrar na plataforma' })).toBeInTheDocument()
  })
  beforeEach(() => {
    sessionStorage.clear()
  })

  const USUARIO = { id: 7, nome: 'Ana Souza', email: 'ana@email.com', perfil: 'ALUNO' as const }

  const LOGIN = {
    token: 'token-emitido-pelo-login',
    tipo: 'Bearer',
    expiraEmMinutos: 60,
    ...USUARIO,
  }

  const USUARIO_ADMIN = { ...USUARIO, perfil: 'ADMIN' as const }

  /** Backend com login valido e recurso protegido funcionando. */
  function instalarBackend(valido: boolean) {
    return instalarFetch(({ url, init }) => {
      if (url === '/api/auth/login') {
        return valido
          ? respostaJson(200, LOGIN)
          : respostaJson(401, {
              erros: [{ campo: 'credenciais', mensagem: 'E-mail ou senha invalidos.' }],
            })
      }

      if (url === '/api/auth/me') {
        // Recurso protegido: exige o cabecalho Authorization com o token.
        const cabecalho = new Headers(init?.headers).get('Authorization')
        if (cabecalho === `Bearer ${LOGIN.token}`) {
          return respostaJson(200, USUARIO)
        }
        return respostaJson(401, {
          erros: [{ campo: 'autenticacao', mensagem: 'Faca login para acessar este recurso.' }],
        })
      }

      if (url === '/api/perfil/foto') {
        return new Response(null, { status: 204 })
      }

      throw new Error(`URL inesperada no teste: ${url}`)
    })
  }

  /** Backend onde a sessao pertence a um ADMIN com usuarios para listar. */
  function instalarBackendAdmin() {
    return instalarFetch(({ url, init }) => {
      if (url === '/api/auth/login') {
        return respostaJson(200, LOGIN)
      }

      if (url === '/api/auth/me') {
        const cabecalho = new Headers(init?.headers).get('Authorization')
        if (cabecalho === `Bearer ${LOGIN.token}`) {
          return respostaJson(200, USUARIO_ADMIN)
        }
        return respostaJson(401, {
          erros: [{ campo: 'autenticacao', mensagem: 'Faca login para acessar este recurso.' }],
        })
      }

      if (url === '/api/perfil/foto') {
        return new Response(null, { status: 204 })
      }

      if (url === '/api/admin/usuarios') {
        return respostaJson(200, [
          { id: 7, nome: 'Ana Souza', email: 'ana@email.com', perfil: 'ADMIN' },
          { id: 9, nome: 'Bruno Lima', email: 'bruno@email.com', perfil: 'ALUNO' },
        ])
      }

      if (url === '/api/admin/editais/importacoes') {
        return respostaJson(200, [])
      }

      throw new Error(`URL inesperada no teste: ${url}`)
    })
  }

  async function entrarNaPlataforma() {
    const usuario = userEvent.setup()
    await usuario.type(screen.getByLabelText('E-mail'), 'ana@email.com')
    await usuario.type(screen.getByLabelText('Senha'), 'senha1234')
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }))
  }

  // -----------------------------------------------------------------------
  // 6. Acesso a area autenticada com autenticacao valida
  // -----------------------------------------------------------------------
  it('apos o login valido mostra a area autenticada com os dados do usuario', async () => {
    const fetchFalso = instalarBackend(true)

    renderizarApp()
    await entrarNaPlataforma()

    expect(await screen.findByRole('heading', { name: 'Área autenticada' })).toBeInTheDocument()
    expect(await screen.findByText('Ana Souza')).toBeInTheDocument()
    expect(screen.getByText('ana@email.com')).toBeInTheDocument()

    // O recurso protegido foi chamado com o token no cabecalho.
    const chamadaProMe = fetchFalso.mock.calls.filter((chamada) => String(chamada[0]) === '/api/auth/me')
    expect(chamadaProMe).toHaveLength(1)
  })

  it('nao mostra a area autenticada quando as credenciais sao recusadas', async () => {
    instalarBackend(false)

    renderizarApp()
    await entrarNaPlataforma()

    expect(await screen.findByText('E-mail ou senha invalidos.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Área autenticada' })).not.toBeInTheDocument()
    expect(sessionStorage.getItem('plataforma:token')).toBeNull()
  })

  // -----------------------------------------------------------------------
  // HU04 - Perfis de Acesso Diferenciados
  // -----------------------------------------------------------------------
  it('ALUNO nao ve o botao da area admin', async () => {
    instalarBackend(true)

    renderizarApp()
    await entrarNaPlataforma()

    await screen.findByRole('heading', { name: 'Área autenticada' })
    expect(screen.queryByRole('button', { name: 'Área admin' })).not.toBeInTheDocument()
  })

  it('ADMIN ve o botao da area admin e abre a lista de usuarios', async () => {
    instalarBackendAdmin()

    renderizarApp()
    await entrarNaPlataforma()

    await screen.findByRole('heading', { name: 'Área autenticada' })
    await userEvent.click(await screen.findByRole('button', { name: 'Área admin' }))

    expect(await screen.findByRole('heading', { name: 'Área admin' })).toBeInTheDocument()
    expect(screen.getByText('Ana Souza')).toBeInTheDocument()
    expect(screen.getByText('bruno@email.com')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(await screen.findByRole('heading', { name: 'Área autenticada' })).toBeInTheDocument()
  })

  it('ADMIN abre a importacao de editais e volta para a area admin', async () => {
    instalarBackendAdmin()

    renderizarApp()
    await entrarNaPlataforma()

    await screen.findByRole('heading', { name: 'Área autenticada' })
    await userEvent.click(await screen.findByRole('button', { name: 'Área admin' }))
    await screen.findByRole('heading', { name: 'Área admin' })

    await userEvent.click(screen.getByRole('button', { name: 'Importar editais' }))
    expect(await screen.findByRole('heading', { name: 'Importar editais' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(await screen.findByRole('heading', { name: 'Área admin' })).toBeInTheDocument()
  })

  // -----------------------------------------------------------------------
  // 8. Logout
  // -----------------------------------------------------------------------
  it('o botao de sair descarta o token e volta para a tela de login', async () => {
    instalarBackend(true)

    renderizarApp()
    await entrarNaPlataforma()

    await screen.findByRole('heading', { name: 'Área autenticada' })

    await userEvent.click(screen.getByRole('button', { name: 'Sair' }))

    expect(
      await screen.findByRole('heading', { name: 'Entrar na plataforma' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Área autenticada' })).not.toBeInTheDocument()
    expect(sessionStorage.getItem('plataforma:token')).toBeNull()
  })

  // -----------------------------------------------------------------------
  // 9. Nao da para continuar na area autenticada depois do logout
  // -----------------------------------------------------------------------
  it('depois do logout uma nova montagem comeca na tela de login', async () => {
    instalarBackend(true)

    const { unmount } = renderizarApp()
    await entrarNaPlataforma()
    await screen.findByRole('heading', { name: 'Área autenticada' })

    await userEvent.click(screen.getByRole('button', { name: 'Sair' }))
    await screen.findByRole('heading', { name: 'Entrar na plataforma' })

    unmount()
    renderizarApp()

    // Recarregar a pagina depois do logout nao devolve a area autenticada.
    expect(screen.getByRole('heading', { name: 'Entrar na plataforma' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sair' })).not.toBeInTheDocument()
  })

  it('depois do logout a area autenticada nao abre mais, mesmo com token valido', async () => {
    const fetchFalso = instalarBackend(true)

    renderizarApp()
    await entrarNaPlataforma()
    await screen.findByRole('heading', { name: 'Área autenticada' })

    await userEvent.click(screen.getByRole('button', { name: 'Sair' }))
    await screen.findByRole('heading', { name: 'Entrar na plataforma' })

    // O logout nao chama a API (a API e sem estado, ver docs/hu/02) e nao abre
    // nenhuma requisicao autenticada: sem token guardado, o app so consegue
    // chegar a area autenticada passando pelo login de novo.
    const chamadasProMe = () =>
      fetchFalso.mock.calls
        .map((chamada) => String(chamada[0]))
        .filter((url) => url === '/api/auth/me')

    expect(chamadasProMe()).toHaveLength(1)
    expect(screen.queryByRole('button', { name: 'Sair' })).not.toBeInTheDocument()

    // Toda chamada ao recurso protegido levou o token no cabecalho - e nenhuma
    // saiu depois do logout sem ele.
    const chamadasAutenticadas = fetchFalso.mock.calls.filter(
      (chamada) => String(chamada[0]) === '/api/auth/me',
    )
    expect(chamadasAutenticadas.length).toBeGreaterThan(0)
    for (const [, init] of chamadasAutenticadas) {
      expect(new Headers(init?.headers).get('Authorization')).toBe(`Bearer ${LOGIN.token}`)
    }
  })

  // -----------------------------------------------------------------------
  // Sessao que deixa de valer sem o usuario pedir
  // -----------------------------------------------------------------------
  it('volta para o login com aviso quando o token deixa de ser aceito', async () => {
    sessionStorage.setItem('plataforma:token', 'token-que-o-backend-nao-aceita')

    instalarFetch(() =>
      respostaJson(401, {
        erros: [{ campo: 'autenticacao', mensagem: 'Faca login para acessar este recurso.' }],
      }),
    )

    renderizarApp()

    expect(await screen.findByRole('heading', { name: 'Entrar na plataforma' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Sua sessão expirou. Faça login novamente.',
    )
    expect(sessionStorage.getItem('plataforma:token')).toBeNull()
  })

  it('mantem a sessao quando a aba recarrega com o token guardado', async () => {
    sessionStorage.setItem('plataforma:token', LOGIN.token)

    instalarFetch(({ url, init }) => {
      const cabecalho = new Headers(init?.headers).get('Authorization')
      if (url === '/api/auth/me' && cabecalho === `Bearer ${LOGIN.token}`) {
        return respostaJson(200, USUARIO)
      }
      if (url === '/api/perfil/foto' && cabecalho === `Bearer ${LOGIN.token}`) {
        return new Response(null, { status: 204 })
      }
      return respostaJson(401, { erros: [{ campo: 'autenticacao', mensagem: 'sem sessao' }] })
    })

    renderizarApp()

    expect(await screen.findByRole('heading', { name: 'Área autenticada' })).toBeInTheDocument()
  })

  // -----------------------------------------------------------------------
  // Tela inicial
  // -----------------------------------------------------------------------
  it('comeca na tela de login quando nao ha token guardado', () => {
    instalarBackend(true)

    renderizarApp()

    expect(screen.getByRole('heading', { name: 'Entrar na plataforma' })).toBeInTheDocument()
  })

  it('da para chegar ao cadastro da HU01 e voltar para o login', async () => {
    instalarBackend(true)

    renderizarApp()

    await userEvent.click(screen.getByRole('button', { name: 'Cadastre-se' }))
    expect(
      await screen.findByRole('heading', { name: 'Cadastro de Usuário' }),
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(
      await screen.findByRole('heading', { name: 'Entrar na plataforma' }),
    ).toBeInTheDocument()
  })
})
