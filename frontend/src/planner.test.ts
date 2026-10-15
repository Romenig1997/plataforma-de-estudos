import { afterEach, describe, expect, it, vi } from 'vitest'
import { buscarPlano, distribuirMinutos, gerarPlano, formatarTempo } from './planner'
import { ErroDeApi, ErroDeRede, SessaoEncerrada } from './sessao'
import { instalarFetch, respostaJson } from './testes/ajuda'

afterEach(() => vi.unstubAllGlobals())
describe('planner API', () => {
  it('plano ausente retorna null sem tentar ler corpo', async () => {
    const fetch = instalarFetch(() => respostaJson(204))
    expect(await buscarPlano('token')).toBeNull()
    expect(new Headers(fetch.mock.calls[0][1]?.headers).get('Authorization')).toBe('Bearer token')
  })
  it('gera com prioridades e meta no PUT autenticado', async () => {
    const fetch = instalarFetch(() => respostaJson(200, { id: 1 }))
    const dados = { editalId: 1, metaHorasSemanais: 4, prioridades: [{ disciplinaId: 2, prioridade: 'ALTA' as const }] }
    expect(await gerarPlano('token', dados)).toEqual({ id: 1 })
    expect(fetch.mock.calls[0][1]?.method).toBe('PUT')
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual(dados)
  })
  it('traduz sessao, erro por campo e rede', async () => {
    instalarFetch(() => respostaJson(401)); await expect(buscarPlano('token')).rejects.toBeInstanceOf(SessaoEncerrada)
    instalarFetch(() => respostaJson(400, { erros: [{ campo: 'prioridades', mensagem: 'Informe todas.' }] }))
    await expect(buscarPlano('token')).rejects.toBeInstanceOf(ErroDeApi)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    await expect(buscarPlano('token')).rejects.toBeInstanceOf(ErroDeRede)
  })
  it('formata horas e minutos sem arredondar', () => {
    expect(formatarTempo(0)).toBe('0min'); expect(formatarTempo(9)).toBe('9min')
    expect(formatarTempo(60)).toBe('1h'); expect(formatarTempo(125)).toBe('2h 5min')
  })
})

describe('distribuirMinutos (mesmo metodo do DistribuidorSemanal do backend)', () => {
  it('reparte proporcionalmente aos pesos', () => {
    expect(distribuirMinutos(6, [{ disciplinaId: 1, prioridade: 'BAIXA' }, { disciplinaId: 2, prioridade: 'NORMAL' }, { disciplinaId: 3, prioridade: 'ALTA' }])).toEqual({ 1: 60, 2: 120, 3: 180 })
  })
  it('preserva a meta e desempata os restos pelo id', () => {
    const entradas = [3, 1, 2, 4, 5, 6, 7].map(disciplinaId => ({ disciplinaId, prioridade: 'NORMAL' as const }))
    const minutos = distribuirMinutos(1, entradas)
    expect([1, 2, 3, 4, 5, 6, 7].map(id => minutos[id])).toEqual([9, 9, 9, 9, 8, 8, 8])
  })
  it('meta invalida nao gera previa', () => {
    expect(distribuirMinutos(0, [{ disciplinaId: 1, prioridade: 'NORMAL' }])).toEqual({})
  })
})
