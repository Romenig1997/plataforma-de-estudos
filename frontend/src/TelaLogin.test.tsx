import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import TelaLogin from './TelaLogin'
import { corpoEnviado, instalarFetch, respostaJson } from './testes/ajuda'

/**
 * Criterios de aceite da tela de login (HU02).
 *
 * Cada teste monta a tela com um `fetch` falso que responde o cenario
 * descrito, preenche o formulario como uma pessoa e confere o que aparece e o
 * que foi enviado para a API.
 */
describe('TelaLogin', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  const TOKEN = 'token-emitido-pelo-login'

  const loginValido = {
    token: TOKEN,
    tipo: 'Bearer',
    expiraEmMinutos: 60,
    id: 1,
    nome: 'Ana Souza',
    email: 'ana@email.com',
  }

  async function preencherEEntrar(email: string, senha: string) {
    const usuario = userEvent.setup()
    await usuario.type(screen.getByLabelText('E-mail'), email)
    await usuario.type(screen.getByLabelText('Senha'), senha)
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }))
  }

  // -----------------------------------------------------------------------
  // 1. Login com credenciais validas
  // -----------------------------------------------------------------------
  it('entra com credenciais validas, guarda o token e avisa a casca', async () => {
    const fetchFalso = instalarFetch(() => respostaJson(200, loginValido))
    const onAutenticado = vi.fn()

    render(<TelaLogin onAutenticado={onAutenticado} onIrParaCadastro={vi.fn()} />)

    await preencherEEntrar('ana@email.com', 'senha1234')

    expect(onAutenticado).toHaveBeenCalledWith(TOKEN)
    expect(sessionStorage.getItem('plataforma:token')).toBe(TOKEN)

    // A requisicao vai para o endpoint de login, com e-mail normalizado.
    expect(fetchFalso).toHaveBeenCalledTimes(1)
    expect(String(fetchFalso.mock.calls[0][0])).toBe('/api/auth/login')
    expect(
      corpoEnviado({ url: String(fetchFalso.mock.calls[0][0]), init: fetchFalso.mock.calls[0][1] }),
    ).toEqual({
      email: 'ana@email.com',
      senha: 'senha1234',
    })
  })

it('mostra o estado de carregamento enquanto a API responde', async () => {
    let resolver: ((resposta: Response) => void) | undefined
    instalarFetch(
      () =>
        new Promise<Response>((aceitar) => {
          resolver = aceitar
        }),
    )

    render(<TelaLogin onAutenticado={vi.fn()} onIrParaCadastro={vi.fn()} />)

    await preencherEEntrar('ana@email.com', 'senha1234')

    // Timeout maior que o padrao: o estado de carregamento aparece logo apos
    // o clique, mas numa maquina carregada o act do React pode demorar um
    // pouco a repintar.
    const botao = await screen.findByRole('button', { name: 'Entrando...' }, { timeout: 5000 })
    expect(botao).toBeDisabled()
    expect(screen.getByLabelText('E-mail')).toBeDisabled()

    resolver?.(respostaJson(200, loginValido))
  })

  // -----------------------------------------------------------------------
  // 2. Login com e-mail inexistente
  // -----------------------------------------------------------------------
  it('recusa e-mail inexistente com mensagem de credencial invalida', async () => {
    instalarFetch(() =>
      respostaJson(401, {
        erros: [{ campo: 'credenciais', mensagem: 'E-mail ou senha invalidos.' }],
      }),
    )
    const onAutenticado = vi.fn()

    render(<TelaLogin onAutenticado={onAutenticado} onIrParaCadastro={vi.fn()} />)

    await preencherEEntrar('ninguem@email.com', 'senha1234')

    expect(await screen.findByText('E-mail ou senha invalidos.')).toBeInTheDocument()
    expect(onAutenticado).not.toHaveBeenCalled()
    expect(sessionStorage.getItem('plataforma:token')).toBeNull()
  })

  // -----------------------------------------------------------------------
  // 3. Login com senha incorreta
  // -----------------------------------------------------------------------
  it('recusa senha incorreta com a mesma mensagem do e-mail inexistente', async () => {
    instalarFetch(() =>
      respostaJson(401, {
        erros: [{ campo: 'credenciais', mensagem: 'E-mail ou senha invalidos.' }],
      }),
    )
    const onAutenticado = vi.fn()

    render(<TelaLogin onAutenticado={onAutenticado} onIrParaCadastro={vi.fn()} />)

    await preencherEEntrar('ana@email.com', 'senhavariada9')

    expect(await screen.findByText('E-mail ou senha invalidos.')).toBeInTheDocument()
    expect(onAutenticado).not.toHaveBeenCalled()
  })

  // -----------------------------------------------------------------------
  // 4. Validacao dos campos obrigatorios
  // -----------------------------------------------------------------------
  it('nao chama a API e mostra o erro quando os campos estao vazios', async () => {
    const fetchFalso = instalarFetch(() => respostaJson(200, loginValido))
    const onAutenticado = vi.fn()

    render(<TelaLogin onAutenticado={onAutenticado} onIrParaCadastro={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Informe o e-mail.')).toBeInTheDocument()
    expect(screen.getByText('Informe a senha.')).toBeInTheDocument()
    expect(fetchFalso).not.toHaveBeenCalled()
    expect(onAutenticado).not.toHaveBeenCalled()

    // O campo com erro fica marcado para quem navega por leitor de tela.
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true')
  })

  it('nao chama a API quando o e-mail nao tem formato valido', async () => {
    const fetchFalso = instalarFetch(() => respostaJson(200, loginValido))

    render(<TelaLogin onAutenticado={vi.fn()} onIrParaCadastro={vi.fn()} />)

    await preencherEEntrar('nao-e-um-email', 'senha1234')

    expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument()
    expect(fetchFalso).not.toHaveBeenCalled()
  })

  it('exibe o erro por campo devolvido pela API', async () => {
    instalarFetch(() =>
      respostaJson(400, {
        erros: [{ campo: 'senha', mensagem: 'A senha e obrigatoria.' }],
      }),
    )

    render(<TelaLogin onAutenticado={vi.fn()} onIrParaCadastro={vi.fn()} />)

    await preencherEEntrar('ana@email.com', '   ')

    expect(await screen.findByText('A senha e obrigatoria.')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toHaveAttribute('aria-invalid', 'true')
  })

  // -----------------------------------------------------------------------
  // Feedback ao usuario
  // -----------------------------------------------------------------------
  it('distingue erro de rede de erro de credencial', async () => {
    instalarFetch(() => {
      throw new TypeError('Failed to fetch')
    })

    render(<TelaLogin onAutenticado={vi.fn()} onIrParaCadastro={vi.fn()} />)

    await preencherEEntrar('ana@email.com', 'senha1234')

    expect(
      await screen.findByText(/Não foi possível conectar ao servidor/),
    ).toBeInTheDocument()
  })

  it('leva para o cadastro pelo link alternativo', async () => {
    const onIrParaCadastro = vi.fn()

    render(<TelaLogin onAutenticado={vi.fn()} onIrParaCadastro={onIrParaCadastro} />)

    await userEvent.click(screen.getByRole('button', { name: 'Cadastre-se' }))

    expect(onIrParaCadastro).toHaveBeenCalled()
  })

  it('mostra o aviso herdado de uma sessao encerrada', () => {
    render(
      <TelaLogin
        onAutenticado={vi.fn()}
        onIrParaCadastro={vi.fn()}
        aviso="Sua sessão expirou. Faça login novamente."
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Sua sessão expirou. Faça login novamente.')
  })
})