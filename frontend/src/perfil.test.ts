import { beforeEach, describe, expect, it } from 'vitest'

import { buscarPerfil, salvarPerfil } from './perfil'
import { ErroDeApi, ErroDeRede, SessaoEncerrada } from './sessao'
import { corpoEnviado, instalarFetch, respostaJson } from './testes/ajuda'

/**
 * Contrato HTTP do módulo de perfil (HU03).
 *
 * <p>Mesma abordagem de `sessao.test.ts`: um `fetch` falso por teste para
 * conferir URL, metodo, cabecalho e corpo - e as tres falhas tipadas que a
 * tela precisa distinguir (rede, API, sessao encerrada).
 */
describe('perfil', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  const TOKEN = 'token-da-sessao'

  const PERFIL = {
    id: 7,
    nome: 'Ana Souza',
    email: 'ana@email.com',
    metaEstudoSemanal: 10,
    objetivoMotivacao: 'Passar no concurso da Receita Federal',
  }

  // -----------------------------------------------------------------------
  // Leitura
  // -----------------------------------------------------------------------
  it('buscarPerfil pede o recurso com o token no cabecalho Authorization', async () => {
    const fetchFalso = instalarFetch(() => respostaJson(200, PERFIL))

    const perfil = await buscarPerfil(TOKEN)

    expect(perfil).toEqual(PERFIL)
    expect(fetchFalso).toHaveBeenCalledTimes(1)
    expect(String(fetchFalso.mock.calls[0][0])).toBe('/api/perfil')
    expect(fetchFalso.mock.calls[0][1]?.method).toBeUndefined()
    expect(new Headers(fetchFalso.mock.calls[0][1]?.headers).get('Authorization')).toBe(
      `Bearer ${TOKEN}`,
    )
  })

  it('buscarPerfil traduz 401 em sessao encerrada', async () => {
    instalarFetch(() =>
      respostaJson(401, {
        erros: [{ campo: 'autenticacao', mensagem: 'Faca login para acessar este recurso.' }],
      }),
    )

    await expect(buscarPerfil(TOKEN)).rejects.toBeInstanceOf(SessaoEncerrada)
  })

  it('buscarPerfil traduz falha de rede em ErroDeRede', async () => {
    instalarFetch(() => {
      throw new TypeError('Failed to fetch')
    })

    await expect(buscarPerfil(TOKEN)).rejects.toBeInstanceOf(ErroDeRede)
  })

  // -----------------------------------------------------------------------
  // Atualizacao
  // -----------------------------------------------------------------------
  it('salvarPerfil envia PUT com o corpo completo e o token no cabecalho', async () => {
    const fetchFalso = instalarFetch(() => respostaJson(200, PERFIL))

    const dados = {
      nome: 'Ana Souza',
      email: 'ana@email.com',
      metaEstudoSemanal: 12,
      objetivoMotivacao: 'Aprovação em concurso federal',
    }

    const salvo = await salvarPerfil(TOKEN, dados)

    expect(salvo).toEqual(PERFIL)
    expect(String(fetchFalso.mock.calls[0][0])).toBe('/api/perfil')
    expect(fetchFalso.mock.calls[0][1]?.method).toBe('PUT')
    expect(new Headers(fetchFalso.mock.calls[0][1]?.headers).get('Authorization')).toBe(
      `Bearer ${TOKEN}`,
    )
    expect(corpoEnviado({ url: '/api/perfil', init: fetchFalso.mock.calls[0][1] })).toEqual(dados)
  })

  it('salvarPerfil preserva null nos campos opcionais', async () => {
    const fetchFalso = instalarFetch(() =>
      respostaJson(200, {
        ...PERFIL,
        metaEstudoSemanal: null,
        objetivoMotivacao: null,
      }),
    )

    await salvarPerfil(TOKEN, {
      nome: 'Ana Souza',
      email: 'ana@email.com',
      metaEstudoSemanal: null,
      objetivoMotivacao: null,
    })

    const corpo = corpoEnviado({ url: '/api/perfil', init: fetchFalso.mock.calls[0][1] })
    expect(corpo.metaEstudoSemanal).toBeNull()
    expect(corpo.objetivoMotivacao).toBeNull()
  })

  it('salvarPerfil devolve ErroDeApi com os erros por campo em 400', async () => {
    instalarFetch(() =>
      respostaJson(400, {
        erros: [{ campo: 'metaEstudoSemanal', mensagem: 'A meta semanal deve ter no maximo 168 horas.' }],
      }),
    )

    const falha = await salvarPerfil(TOKEN, {
      nome: 'Ana Souza',
      email: 'ana@email.com',
      metaEstudoSemanal: 200,
      objetivoMotivacao: null,
    }).catch((erro: unknown) => erro)

    expect(falha).toBeInstanceOf(ErroDeApi)
    expect((falha as ErroDeApi).status).toBe(400)
    expect((falha as ErroDeApi).erros).toEqual([
      { campo: 'metaEstudoSemanal', mensagem: 'A meta semanal deve ter no maximo 168 horas.' },
    ])
  })

  it('salvarPerfil devolve SessaoEncerrada quando o token nao vale mais', async () => {
    instalarFetch(() =>
      respostaJson(401, {
        erros: [{ campo: 'autenticacao', mensagem: 'Faca login para acessar este recurso.' }],
      }),
    )

    await expect(
      salvarPerfil('token-antigo', {
        nome: 'Ana Souza',
        email: 'ana@email.com',
        metaEstudoSemanal: null,
        objetivoMotivacao: null,
      }),
    ).rejects.toBeInstanceOf(SessaoEncerrada)
  })
})
