import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TelaCronograma from './TelaCronograma'
import { instalarFetch, respostaJson } from './testes/ajuda'
import type { Cronograma } from './cronograma'

const plano={id:1,metaHorasSemanais:2,edital:{titulo:'Edital CBM'}}
const agenda: Cronograma={id:1,semanaInicio:'2026-10-19',metaHorasSemanais:2,editalTitulo:'Edital CBM',desatualizado:false,geradoEm:'',
  disponibilidades:[{diaSemana:1,inicio:'19:00:00',fim:'21:00:00'}], atividades:[
    {id:1,data:'2026-10-19',inicio:'19:00:00',fim:'20:00:00',disciplinaId:10,disciplina:'Português',conteudoId:20,conteudo:'Interpretação de textos',pagina:2},
    {id:2,data:'2026-10-19',inicio:'20:00:00',fim:'21:00:00',disciplinaId:11,disciplina:'Matemática',conteudoId:21,conteudo:'Álgebra',pagina:5},
  ]}
const props=()=>({token:'token',onEncerrarSessao:vi.fn(),onVoltar:vi.fn(),onIrParaPlanner:vi.fn()})
function api(salvo: Cronograma|null=null,temPlano=true) {
  return instalarFetch(({url,init})=>{
    if(url==='/api/planner') return temPlano?respostaJson(200,plano):respostaJson(204)
    if(url==='/api/cronograma') return init?.method==='PUT'?respostaJson(200,agenda):salvo?respostaJson(200,salvo):respostaJson(204)
    throw new Error(url)
  })
}
afterEach(()=>vi.unstubAllGlobals())
describe('TelaCronograma',()=>{
  it('sem plano informa dependencia e oferece navegacao',async()=>{
    api(null,false);const p=props();render(<TelaCronograma {...p}/>)
    await screen.findByText('Gere e salve um plano semanal para criar seu cronograma.')
    await userEvent.click(screen.getByRole('button',{name:'Editar plano semanal'}));expect(p.onIrParaPlanner).toHaveBeenCalled()
    expect(screen.queryByRole('button',{name:'Gerar e salvar cronograma'})).not.toBeInTheDocument()
  })
  it('recebe dias horarios e semana e mostra atividades geradas',async()=>{
    const fetch=api();render(<TelaCronograma {...props()}/>)
    const semana=await screen.findByLabelText('Semana iniciando em');await userEvent.clear(semana);await userEvent.type(semana,'2026-10-19')
    await userEvent.click(screen.getByRole('button',{name:'Adicionar horário'}))
    await userEvent.type(screen.getByLabelText('Início — horário 1'),'19:00');await userEvent.type(screen.getByLabelText('Fim — horário 1'),'21:00')
    await userEvent.click(screen.getByRole('button',{name:'Gerar e salvar cronograma'}))
    expect(await screen.findByText('Cronograma gerado e salvo.')).toBeInTheDocument()
    expect(screen.getByText('19:00–20:00 · Português')).toBeInTheDocument()
    expect(screen.getByText('Interpretação de textos',{exact:false})).toHaveTextContent('pág. 2')
    const chamada=fetch.mock.calls.find(c=>c[1]?.method==='PUT')
    expect(JSON.parse(String(chamada?.[1]?.body))).toEqual({semanaInicio:'2026-10-19',disponibilidades:[{diaSemana:1,inicio:'19:00',fim:'21:00'}]})
  })
  it('restaura disponibilidade e sinaliza plano modificado',async()=>{
    api({...agenda,desatualizado:true});render(<TelaCronograma {...props()}/>)
    expect(await screen.findByLabelText('Início — horário 1')).toHaveValue('19:00')
    expect(screen.getByText('Seu plano semanal foi alterado após a geração desta agenda. Gere o cronograma novamente para usar a nova meta e as prioridades.')).toBeInTheDocument()
  })
  it('disponibilidade insuficiente nao envia nem apaga agenda anterior',async()=>{
    const fetch=api(agenda);render(<TelaCronograma {...props()}/>)
    const fim=await screen.findByLabelText('Fim — horário 1');await userEvent.clear(fim);await userEvent.type(fim,'20:00')
    await userEvent.click(screen.getByRole('button',{name:'Gerar e salvar cronograma'}))
    expect(screen.getByText('Sua disponibilidade não comporta a meta semanal. Ajuste os horários ou a meta do planner.')).toBeInTheDocument()
    expect(screen.getByText('Álgebra',{exact:false})).toBeInTheDocument();expect(fetch.mock.calls.some(c=>c[1]?.method==='PUT')).toBe(false)
  })
  it('recusa sobreposicao de horarios antes do envio',async()=>{
    const fetch=api(agenda);render(<TelaCronograma {...props()}/>)
    await screen.findByLabelText('Início — horário 1');await userEvent.click(screen.getByRole('button',{name:'Adicionar horário'}))
    await userEvent.type(screen.getByLabelText('Início — horário 2'),'20:00');await userEvent.type(screen.getByLabelText('Fim — horário 2'),'22:00')
    await userEvent.click(screen.getByRole('button',{name:'Gerar e salvar cronograma'}))
    expect(screen.getByText('Os horários disponíveis não podem se sobrepor no mesmo dia.')).toBeInTheDocument()
    expect(fetch.mock.calls.some(c=>c[1]?.method==='PUT')).toBe(false)
  })
  it('sessao expirada encerra acesso e erro de carga permite retomar',async()=>{
    const p=props();instalarFetch(()=>respostaJson(401));render(<TelaCronograma {...p}/>)
    await waitFor(()=>expect(p.onEncerrarSessao).toHaveBeenCalled())
  })
  it('falha de rede oferece tentar novamente',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('offline')));render(<TelaCronograma {...props()}/>)
    await screen.findByRole('button',{name:'Tentar novamente'});api(agenda)
    await userEvent.click(screen.getByRole('button',{name:'Tentar novamente'}));expect(await screen.findByRole('heading',{name:'Agenda semanal salva'})).toBeInTheDocument()
  })
})
