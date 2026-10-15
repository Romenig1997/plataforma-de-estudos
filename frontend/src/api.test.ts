import { afterEach, describe, expect, it, vi } from 'vitest'
import { mensagemDaFalha, MENSAGEM_SESSAO_EXPIRADA, requisitar, requisitarOpcional } from './api'
import { ErroDeApi, ErroDeRede, SessaoEncerrada } from './sessao'
import { instalarFetch, respostaJson } from './testes/ajuda'

afterEach(() => vi.unstubAllGlobals())

describe('cliente da API', () => {
  it('envia token e JSON e omite metodo no GET', async () => {
    const fetch = instalarFetch(() => respostaJson(200, {}))
    await requisitar('/api/x', 'abc')
    expect(fetch.mock.calls[0][1]?.method).toBeUndefined()
    expect(fetch.mock.calls[0][1]?.headers).toEqual({ Authorization: 'Bearer abc' })

    await requisitar('/api/x', 'abc', { metodo: 'PUT', json: { a: 1 } })
    expect(fetch.mock.calls[1][1]?.headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer abc' })
    expect(fetch.mock.calls[1][1]?.body).toBe('{"a":1}')
  })

  it('traduz rede, 401 autenticado, 401 publico e erro de validacao', async () => {
    instalarFetch(() => { throw new Error('offline') })
    await expect(requisitar('/api/x', 'abc')).rejects.toBeInstanceOf(ErroDeRede)

    instalarFetch(() => respostaJson(401))
    await expect(requisitar('/api/x', 'abc')).rejects.toBeInstanceOf(SessaoEncerrada)
    await expect(requisitar('/api/x')).rejects.toBeInstanceOf(ErroDeApi)

    instalarFetch(() => respostaJson(400, { erros: [{ campo: 'nome', mensagem: 'Informe o nome.' }] }))
    await expect(requisitar('/api/x', 'abc')).rejects.toMatchObject({ status: 400, message: 'Informe o nome.' })
  })

  it('204 vira null nas leituras opcionais', async () => {
    instalarFetch(() => respostaJson(204))
    expect(await requisitarOpcional('/api/planner', 'abc')).toBeNull()
  })

  it('mensagemDaFalha encerra a sessao expirada e traduz as demais falhas', () => {
    const encerrar = vi.fn()
    expect(mensagemDaFalha(new SessaoEncerrada(), encerrar, 'padrão')).toBeNull()
    expect(encerrar).toHaveBeenCalledWith(MENSAGEM_SESSAO_EXPIRADA)
    expect(mensagemDaFalha(new ErroDeRede(), encerrar, 'padrão')).toMatch(/conectar ao servidor/)
    expect(mensagemDaFalha(new ErroDeApi(400, [{ campo: 'x', mensagem: 'Erro A.' }]), encerrar, 'padrão')).toBe('Erro A.')
    expect(mensagemDaFalha(new Error('?'), encerrar, 'padrão')).toBe('padrão')
  })
})
