import { afterEach, describe, expect, it, vi } from 'vitest'
import { buscarCronograma, gerarCronograma, minutosHorario, dataLegivel } from './cronograma'
import { ErroDeApi, ErroDeRede, SessaoEncerrada } from './sessao'
import { instalarFetch, respostaJson } from './testes/ajuda'

afterEach(() => vi.unstubAllGlobals())
describe('cronograma API', () => {
  it('cronograma ausente retorna null e consulta autenticada', async () => {
    const fetch=instalarFetch(()=>respostaJson(204))
    expect(await buscarCronograma('token')).toBeNull()
    expect(new Headers(fetch.mock.calls[0][1]?.headers).get('Authorization')).toBe('Bearer token')
  })
  it('envia semana e disponibilidade por PUT sem identidade fornecida pelo cliente', async () => {
    const dados={ semanaInicio:'2026-10-19', disponibilidades:[{diaSemana:1,inicio:'19:00',fim:'21:00'}] }
    const fetch=instalarFetch(()=>respostaJson(200,{id:1,...dados}))
    expect(await gerarCronograma('token',dados)).toHaveProperty('id',1)
    expect(fetch.mock.calls[0][1]?.method).toBe('PUT')
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual(dados)
  })
  it('traduz sessao expirada, validacao e falha de rede', async () => {
    instalarFetch(()=>respostaJson(401)); await expect(buscarCronograma('token')).rejects.toBeInstanceOf(SessaoEncerrada)
    instalarFetch(()=>respostaJson(400,{erros:[{campo:'disponibilidades',mensagem:'Horarios sobrepostos.'}]})); await expect(buscarCronograma('token')).rejects.toBeInstanceOf(ErroDeApi)
    vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('offline'))); await expect(buscarCronograma('token')).rejects.toBeInstanceOf(ErroDeRede)
  })
  it('trabalha em minutos e apresenta datas locais', () => {
    expect(minutosHorario('19:30')).toBe(1170); expect(minutosHorario('19:30:00')).toBe(1170)
    expect(minutosHorario('24:00')).toBeNaN(); expect(minutosHorario('')).toBeNaN()
    expect(dataLegivel('2026-10-19')).toContain('19/10/2026')
  })
})
