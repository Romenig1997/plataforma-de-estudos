import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TelaDashboard from './TelaDashboard'
import { instalarFetch, respostaJson } from './testes/ajuda'
import type { Dashboard } from './dashboard'
const base: Dashboard={editalId:1,editalTitulo:'Edital CBM',totalTopicos:2,topicosConcluidos:0,progresso:0,cronogramaDesatualizado:false,
 disciplinas:[{id:10,nome:'Português',questoes:0,acertos:0,desempenho:null,topicos:[{id:20,nome:'Interpretação',pagina:2,concluido:false,questoes:0,acertos:0},{id:21,nome:'Gramática',pagina:2,concluido:false,questoes:0,acertos:0}]}],
 proximasAtividades:[{id:1,data:'2026-10-19',inicio:'19:00:00',fim:'20:00:00',disciplinaId:10,disciplina:'Português',conteudoId:20,conteudo:'Interpretação',pagina:2}]}
const props=()=>({token:'token',onEncerrarSessao:vi.fn(),onVoltar:vi.fn(),onIrParaPlanner:vi.fn(),onIrParaCronograma:vi.fn()})
afterEach(()=>vi.unstubAllGlobals())
async function selecionar(){await screen.findByText('Edital CBM');await userEvent.selectOptions(screen.getByLabelText('Disciplina'),'10');await userEvent.selectOptions(screen.getByLabelText('Tópico'),'20')}
describe('TelaDashboard',()=>{
 it('exibe progresso desempenho sem dados e proximas atividades',async()=>{
  instalarFetch(()=>respostaJson(200,base));render(<TelaDashboard {...props()} />)
  expect(await screen.findByText('Sem dados')).toBeInTheDocument();expect(screen.getByText('0%')).toBeInTheDocument();expect(screen.getByText(/19:00–20:00/)).toBeInTheDocument()
 })
 it('salva somente conclusao e atualiza progresso e atividades',async()=>{
  let atual=base
  const fetch=instalarFetch(({init})=>{if(init?.method==='PUT'){atual={...base,topicosConcluidos:1,progresso:50,proximasAtividades:[]};return respostaJson(204)}return respostaJson(200,atual)})
  render(<TelaDashboard {...props()}/>);await selecionar();await userEvent.click(screen.getByLabelText('Tópico concluído'));await userEvent.click(screen.getByRole('button',{name:'Salvar registro'}))
  expect(await screen.findByText('50%')).toBeInTheDocument();expect(screen.getByText('Sem dados')).toBeInTheDocument();expect(screen.getByText(/Nenhuma atividade futura/)).toBeInTheDocument()
  const chamada=fetch.mock.calls.find(c=>c[1]?.method==='PUT');expect(JSON.parse(String(chamada?.[1]?.body))).toEqual({concluido:true})
 })
 it('restaura valores e permite desmarcar conclusao',async()=>{
  const fetch=instalarFetch(({init})=>init?.method==='PUT'?respostaJson(204):respostaJson(200,{...base,disciplinas:[{...base.disciplinas[0],topicos:[{...base.disciplinas[0].topicos[0],concluido:true,questoes:10,acertos:8}]}]}))
  render(<TelaDashboard {...props()}/>);await selecionar();expect(screen.getByLabelText('Tópico concluído')).toBeChecked();expect(screen.queryByLabelText('Total de acertos')).not.toBeInTheDocument()
  await userEvent.click(screen.getByLabelText('Tópico concluído'));await userEvent.click(screen.getByRole('button',{name:'Salvar registro'}));await screen.findByText('Registro salvo.')
  expect(JSON.parse(String(fetch.mock.calls.find(c=>c[1]?.method==='PUT')?.[1]?.body)).concluido).toBe(false)
 })
 it('nao oferece campos manuais e exige selecao de topico',async()=>{
  const fetch=instalarFetch(()=>respostaJson(200,base));render(<TelaDashboard {...props()}/>);await screen.findByText('Edital CBM');await userEvent.click(screen.getByRole('button',{name:'Salvar registro'}))
  expect(screen.getByLabelText('Tópico')).toHaveAttribute('aria-invalid','true');expect(screen.queryByLabelText('Total de questões respondidas')).not.toBeInTheDocument();expect(screen.queryByLabelText('Total de acertos')).not.toBeInTheDocument();expect(fetch.mock.calls.some(c=>c[1]?.method==='PUT')).toBe(false)
 })
 it('trata ausencia de plano e navegacao',async()=>{
  instalarFetch(()=>respostaJson(204));const p=props();render(<TelaDashboard {...p}/>);await screen.findByText(/Selecione e salve um plano/);await userEvent.click(screen.getByRole('button',{name:'Editar plano semanal'}));expect(p.onIrParaPlanner).toHaveBeenCalled()
 })
 it('encerra sessao expirada e permite repetir falha de rede',async()=>{
  instalarFetch(()=>respostaJson(401));const p=props();const r=render(<TelaDashboard {...p}/>);await screen.findByRole('button',{name:'Atualizar painel'});await vi.waitFor(()=>expect(p.onEncerrarSessao).toHaveBeenCalled());r.unmount()
  let falha=true;instalarFetch(()=>{if(falha)throw new Error('offline');return respostaJson(200,base)});render(<TelaDashboard {...props()}/>);await screen.findByText(/Não foi possível conectar/);falha=false;await userEvent.click(screen.getByRole('button',{name:'Tentar novamente'}));expect(await screen.findByText('Edital CBM')).toBeInTheDocument()
 })
})
