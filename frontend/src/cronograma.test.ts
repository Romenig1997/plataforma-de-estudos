import { afterEach, describe, expect, it, vi } from 'vitest'
import { buscarCronograma, gerarCronograma, minutosHorario, dataLegivel, planejarSemana, janelasDosHorarios } from './cronograma'
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
describe('planejarSemana', () => {
  const dias = (n: number, inicio = '06:00', fim = '12:00') => Array.from({ length: n }, (_, i) => ({ diaSemana: i + 1, inicio, fim }))
  it('divide a meta igualmente entre os dias a partir do inicio do periodo', () => {
    expect(planejarSemana(dias(5), 600, true)).toEqual(dias(5, '06:00', '08:00'))
  })
  it('arredonda cada dia para cima em blocos de 30 minutos', () => {
    // 10h em 3 dias = 3h20 -> 3h30 por dia.
    expect(planejarSemana(dias(3), 600, true).map(d => d.fim)).toEqual(['09:30', '09:30', '09:30'])
  })
  it('nao passa do fim do periodo informado', () => {
    expect(planejarSemana(dias(2, '19:00', '21:00'), 600, true).map(d => d.fim)).toEqual(['21:00', '21:00'])
  })
  it('sem automatico usa o periodo inteiro e ignora periodos invalidos', () => {
    expect(planejarSemana([{ diaSemana: 3, inicio: '18:00', fim: '23:00' }, { diaSemana: 1, inicio: '10:00', fim: '09:00' }], 600, false))
      .toEqual([{ diaSemana: 3, inicio: '18:00', fim: '23:00' }])
    expect(planejarSemana([], 600, true)).toEqual([])
  })
  it('reconstroi as marcacoes so quando ha um horario por dia', () => {
    expect(janelasDosHorarios([{ diaSemana: 2, inicio: '19:00:00', fim: '21:00:00' }])).toEqual([{ diaSemana: 2, inicio: '19:00', fim: '21:00' }])
    expect(janelasDosHorarios([{ diaSemana: 1, inicio: '08:00', fim: '09:00' }, { diaSemana: 1, inicio: '19:00', fim: '20:00' }])).toBeNull()
  })
})
