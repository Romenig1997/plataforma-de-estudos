import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import TelaCronograma from './TelaCronograma'
import { instalarFetch, respostaJson } from './testes/ajuda'
import { inicioSemana, somarDias, hojeLocal, type Cronograma } from './cronograma'

const inscricao={editalId:1,titulo:'Edital CBM',orgao:'CBM',ano:2026,emFoco:true,metaHorasSemanais:2,atualizadoEm:'',totalTopicos:2,topicosConcluidos:0,progresso:0}
const agenda: Cronograma={id:1,semanaInicio:'2026-10-19',metaHorasSemanais:2,editalTitulo:'Edital CBM',desatualizado:false,geradoEm:'',
  disponibilidades:[{diaSemana:1,inicio:'19:00:00',fim:'21:00:00'}], atividades:[
    {id:1,data:'2026-10-19',inicio:'19:00:00',fim:'20:00:00',disciplinaId:10,disciplina:'Português',conteudoId:20,conteudo:'Interpretação de textos',pagina:2},
    {id:2,data:'2026-10-19',inicio:'20:00:00',fim:'21:00:00',disciplinaId:11,disciplina:'Matemática',conteudoId:21,conteudo:'Álgebra',pagina:5},
  ]}
const props=()=>({token:'token',onEncerrarSessao:vi.fn(),onIrParaPlanner:vi.fn()})
const ajustar=async()=>userEvent.click(await screen.findByRole('button',{name:'Ajustar horários'}))
function api(salvo: Cronograma|null=null,cursos=[inscricao],registro=204) {
  return instalarFetch(({url,init})=>{
    if(url==='/api/cursos/inscricoes') return respostaJson(200,cursos)
    if(url.startsWith('/api/dashboard/registros/')) return respostaJson(registro)
    if(url==='/api/cronograma') return init?.method==='PUT'?respostaJson(200,agenda):salvo?respostaJson(200,salvo):respostaJson(204)
    throw new Error(url)
  })
}
afterEach(()=>vi.unstubAllGlobals())
describe('TelaCronograma',()=>{
  it('sem plano informa dependencia e oferece navegacao',async()=>{
    api(null,[]);const p=props();render(<MemoryRouter><TelaCronograma {...p}/></MemoryRouter>)
    await screen.findByText('Inscreva-se em um curso e salve o plano dele para criar seu cronograma.')
    await userEvent.click(screen.getByRole('button',{name:'Editar plano semanal'}));expect(p.onIrParaPlanner).toHaveBeenCalled()
    expect(screen.queryByRole('button',{name:'Gerar e salvar cronograma'})).not.toBeInTheDocument()
  })
  it('recebe dias horarios e semana e mostra atividades geradas',async()=>{
    const fetch=api();render(<MemoryRouter><TelaCronograma {...props()}/></MemoryRouter>)
    // Sem campo de semana: os horarios valem para todas as semanas e o envio usa a semana atual.
    await screen.findByRole('heading',{name:'Seus horários de estudo'});expect(screen.queryByLabelText('Semana iniciando em')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button',{name:'Adicionar horário: Segunda-feira'}))
    await userEvent.type(screen.getByLabelText('Início — Segunda-feira, horário 1'),'19:00');await userEvent.type(screen.getByLabelText('Fim — Segunda-feira, horário 1'),'21:00')
    await userEvent.click(screen.getByRole('button',{name:'Gerar e salvar cronograma'}))
    expect(await screen.findByText('Cronograma gerado e salvo.')).toBeInTheDocument()
    expect(screen.getByText('19:00–20:00')).toBeInTheDocument();expect(screen.getByText('Português')).toBeInTheDocument()
    // Depois de salvar, o formulario recolhe e a agenda fica em destaque.
    expect(screen.queryByRole('button',{name:'Gerar e salvar cronograma'})).not.toBeInTheDocument()
    expect(screen.getByText('Interpretação de textos',{exact:false})).toHaveTextContent('pág. 2')
    const chamada=fetch.mock.calls.find(c=>c[1]?.method==='PUT')
    expect(JSON.parse(String(chamada?.[1]?.body))).toEqual({semanaInicio:inicioSemana(),disponibilidades:[{diaSemana:1,inicio:'19:00',fim:'21:00'}]})
  })
  it('restaura disponibilidade e sinaliza plano modificado',async()=>{
    api({...agenda,desatualizado:true});render(<MemoryRouter><TelaCronograma {...props()}/></MemoryRouter>)
    expect(await screen.findByText('Interpretação de textos',{exact:false})).toBeInTheDocument()
    expect(screen.queryByLabelText('Início — Segunda-feira, horário 1')).not.toBeInTheDocument()
    await ajustar();expect(screen.getByLabelText('Início — Segunda-feira, horário 1')).toHaveValue('19:00')
    expect(screen.getByRole('button',{name:'Fechar ajustes'})).toHaveAttribute('aria-expanded','true')
    expect(screen.getByText(/Seus planos mudaram ou você entrou em um novo curso/)).toBeInTheDocument()
  })
  it('disponibilidade insuficiente nao envia nem apaga agenda anterior',async()=>{
    const fetch=api(agenda);render(<MemoryRouter><TelaCronograma {...props()}/></MemoryRouter>)
    await ajustar();const fim=screen.getByLabelText('Fim — Segunda-feira, horário 1');await userEvent.clear(fim);await userEvent.type(fim,'20:00')
    await userEvent.click(screen.getByRole('button',{name:'Gerar e salvar cronograma'}))
    expect(screen.getByText('Sua disponibilidade não comporta a meta semanal. Ajuste os horários ou a meta do planner.')).toBeInTheDocument()
    expect(screen.getByText('Álgebra',{exact:false})).toBeInTheDocument();expect(fetch.mock.calls.some(c=>c[1]?.method==='PUT')).toBe(false)
  })
  it('recusa sobreposicao de horarios antes do envio',async()=>{
    const fetch=api(agenda);render(<MemoryRouter><TelaCronograma {...props()}/></MemoryRouter>)
    await ajustar();await userEvent.click(screen.getByRole('button',{name:'Adicionar horário: Segunda-feira'}))
    await userEvent.type(screen.getByLabelText('Início — Segunda-feira, horário 2'),'20:00');await userEvent.type(screen.getByLabelText('Fim — Segunda-feira, horário 2'),'22:00')
    await userEvent.click(screen.getByRole('button',{name:'Gerar e salvar cronograma'}))
    expect(screen.getByText('Os horários disponíveis não podem se sobrepor no mesmo dia.')).toBeInTheDocument()
    expect(fetch.mock.calls.some(c=>c[1]?.method==='PUT')).toBe(false)
  })
  it('agenda combinada soma as metas e identifica o curso de cada atividade',async()=>{
    const pm={...inscricao,editalId:2,titulo:'Edital PM',emFoco:false,metaHorasSemanais:1}
    const combinada: Cronograma={...agenda,editalTitulo:'Edital CBM + Edital PM',cursos:[{editalId:1,titulo:'Edital CBM',metaHorasSemanais:2},{editalId:2,titulo:'Edital PM',metaHorasSemanais:1}],
      atividades:[{...agenda.atividades[0],editalId:1},{...agenda.atividades[1],editalId:2}]}
    api(combinada,[inscricao,pm]);render(<MemoryRouter><TelaCronograma {...props()}/></MemoryRouter>)
    expect(await screen.findByText('Edital CBM (2h) + Edital PM (1h)', { exact: false })).toBeInTheDocument()
    await ajustar();expect(screen.getByText('3h',{selector:'strong'})).toBeInTheDocument()
    expect(screen.getByText('Edital PM',{selector:'.cronograma-curso'})).toBeInTheDocument()
  })
  it('sessao expirada encerra acesso e erro de carga permite retomar',async()=>{
    const p=props();instalarFetch(()=>respostaJson(401));render(<MemoryRouter><TelaCronograma {...p}/></MemoryRouter>)
    await waitFor(()=>expect(p.onEncerrarSessao).toHaveBeenCalled())
  })
  it('falha de rede oferece tentar novamente',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('offline')));render(<MemoryRouter><TelaCronograma {...props()}/></MemoryRouter>)
    await screen.findByRole('button',{name:'Tentar novamente'});api(agenda)
    await userEvent.click(screen.getByRole('button',{name:'Tentar novamente'}));expect(await screen.findByRole('group',{name:'Dias da semana'})).toBeInTheDocument()
  })
  it('abre em hoje e troca de dia pela faixa da semana',async()=>{
    const semana=inicioSemana(),hoje=hojeLocal(),outro=hoje===semana?somarDias(semana,1):semana
    api({...agenda,semanaInicio:semana,atividades:[{...agenda.atividades[0],data:hoje},{...agenda.atividades[1],data:outro}]})
    render(<MemoryRouter><TelaCronograma {...props()}/></MemoryRouter>)
    expect(await screen.findByRole('heading',{name:/^Hoje ·/})).toBeInTheDocument()
    expect(screen.getByText('Interpretação de textos',{exact:false})).toBeInTheDocument();expect(screen.queryByText('Álgebra',{exact:false})).not.toBeInTheDocument()
    const botaoHoje=screen.getByRole('button',{name:/\(hoje\): 1 sessão/});expect(botaoHoje).toHaveAttribute('aria-pressed','true')
    const dias=screen.getAllByRole('button',{name:/: \d+ sess(ão|ões)/});expect(dias).toHaveLength(7)
    await userEvent.click(dias[(new Date(outro+'T12:00:00').getDay()+6)%7])
    expect(screen.getByText('Álgebra',{exact:false})).toBeInTheDocument();expect(screen.queryByText('Interpretação de textos',{exact:false})).not.toBeInTheDocument()
  })
  it('marca a sessao como feita, atualiza o resumo e leva para estudar o topico',async()=>{
    const fetch=api({...agenda,atividades:agenda.atividades.map(a=>({...a,editalId:1}))});render(<MemoryRouter><TelaCronograma {...props()}/></MemoryRouter>)
    const caixa=await screen.findByRole('checkbox',{name:'Concluir Interpretação de textos'});expect(caixa).not.toBeChecked()
    expect(screen.getByText(/0 de 2 sessões feitas/)).toBeInTheDocument()
    await userEvent.click(caixa);expect(caixa).toBeChecked();expect(screen.getByText(/1 de 2 sessões feitas/)).toBeInTheDocument()
    const chamada=fetch.mock.calls.find(c=>String(c[0])==='/api/dashboard/registros/20')
    expect(chamada?.[1]?.method).toBe('PUT');expect(JSON.parse(String(chamada?.[1]?.body))).toEqual({concluido:true})
    expect(screen.getByRole('link',{name:'Estudar Interpretação de textos'})).toHaveAttribute('href','/curso/1?aula=20')
  })
  it('desfaz a conclusao quando o servidor recusa',async()=>{
    api(agenda,[inscricao],500);render(<MemoryRouter><TelaCronograma {...props()}/></MemoryRouter>)
    const caixa=await screen.findByRole('checkbox',{name:'Concluir Álgebra'});await userEvent.click(caixa)
    expect(await screen.findByText(/Não foi possível salvar a conclusão|Não foi possível/)).toBeInTheDocument();expect(caixa).not.toBeChecked()
  })
  it('copia os horarios de segunda para os dias uteis',async()=>{
    api(agenda);render(<MemoryRouter><TelaCronograma {...props()}/></MemoryRouter>)
    await ajustar();await userEvent.click(screen.getByRole('button',{name:'Copiar segunda para os dias úteis'}))
    for(const dia of ['Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira']) expect(screen.getByLabelText(`Início — ${dia}, horário 1`)).toHaveValue('19:00')
    expect(screen.queryByLabelText('Início — Sábado, horário 1')).not.toBeInTheDocument()
    expect(screen.getByText('10h',{selector:'strong'})).toBeInTheDocument()
  })
})
