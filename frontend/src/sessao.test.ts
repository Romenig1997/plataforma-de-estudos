import { beforeEach, describe, expect, it } from 'vitest'

import {
  buscarSessaoAtual,
  descartarToken,
  ErroDeApi,
  entrar,
  ErroDeRede,
  guardarToken,
  lerToken,
  SessaoEncerrada,
} from './sessao'
import { instalarFetch, respostaJson } from './testes/ajuda'

/**
 * Regras da camada de sessao (HU02): onde o token fica e o que cada chamada
 * envia. Sao as garantias de que o logout limpa a credencial e de que nenhuma
 * requisicao autenticada sai sem token.
 */
describe('sessao', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  // -----------------------------------------------------------------------
  // 5. Geracao e uso da autenticacao
  // -----------------------------------------------------------------------
  it('guarda, le e descarta o token', () => {
    expect(lerToken()).toBeNull()

    guardarToken('abc.def.ghi')
    expect(lerToken()).toBe('abc.def.ghi')

    descartarToken()
    expect(lerToken()).toBeNull()
  })

  it('o token fica no sessionStorage, que morre com a aba', () => {
    guardarToken('abc.def.ghi')

    // A escolha do sessionStorage e o que impede o token de ficar em disco
    // entre sessoes do navegador, como aconteceria no localStorage.
    expect(window.sessionStorage.getItem('plataforma:token')).toBe('abc.def.ghi')
    expect(window.localStorage.getItem('plataforma:token')).toBeNull()
  })

  it('entrar envia e-mail e senha no corpo da requisicao', async () => {
    const fetchFalso = instalarFetch(() =>
      respostaJson(200, {
        token: 't',
        tipo: 'Bearer',
        expiraEmMinutos: 60,
        id: 1,
        nome: 'Ana',
        email: 'ana@email.com',
      }),
    )

    await entrar('ana@email.com', 'senha1234')

    expect(String(fetchFalso.mock.calls[0][0])).toBe('/api/auth/login')
    expect(fetchFalso.mock.calls[0][1]?.method).toBe('POST')
    expect(fetchFalso.mock.calls[0][1]?.body).toBe(
      '{"email":"ana@email.com","senha":"senha1234"}',
    )
  })

  it('recusa credenciais invalidas com o erro por campo da API', async () => {
    instalarFetch(() =>
      respostaJson(401, {
        erros: [{ campo: 'credenciais', mensagem: 'E-mail ou senha invalidos.' }],
      }),
    )

    const erro = await entrar('ninguem@email.com', 'senha1234').catch((falha) => falha)

    expect(erro).toBeInstanceOf(ErroDeApi)
    expect((erro as ErroDeApi).status).toBe(401)
    expect((erro as ErroDeApi).mensagemDoCampo('credenciais')).toBe('E-mail ou senha invalidos.')
  })

  it('traduz falha de rede em erro proprio', async () => {
    instalarFetch(() => {
      throw new TypeError('Failed to fetch')
    })

    await expect(entrar('ana@email.com', 'senha1234')).rejects.toBeInstanceOf(ErroDeRede)
  })

  // -----------------------------------------------------------------------
  // 6. Acesso a recurso protegido
  // -----------------------------------------------------------------------
  it('buscarSessaoAtual manda o token no cabecalho Authorization', async () => {
    const fetchFalso = instalarFetch(() =>
      respostaJson(200, { id: 1, nome: 'Ana', email: 'ana@email.com' }),
    )

    await buscarSessaoAtual('abc.def.ghi')

    expect(String(fetchFalso.mock.calls[0][0])).toBe('/api/auth/me')
    const cabecalhos = new Headers(fetchFalso.mock.calls[0][1]?.headers)
    expect(cabecalhos.get('Authorization')).toBe('Bearer abc.def.ghi')
  })

  it('401 em recurso protegido significa sessao encerrada', async () => {
    instalarFetch(() =>
      respostaJson(401, {
        erros: [{ campo: 'autenticacao', mensagem: 'Faca login para acessar este recurso.' }],
      }),
    )

    await expect(buscarSessaoAtual('token-expirado')).rejects.toBeInstanceOf(SessaoEncerrada)
  })
})