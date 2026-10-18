import { useEffect,useState,type FormEvent } from 'react'
import {listarEditaisAprovados,type EditalAprovado} from './editais'
import {listarRevisoes,salvarQuestao,publicarQuestao,importarQuestoes,type RevisaoQuestao,type QuestaoRascunho} from './questoes'
import {ErroDeApi,SessaoEncerrada} from './sessao'
import { CabecalhoDaPagina, Conteudo } from './componentes/Pagina'
import EstadoVazio from './componentes/EstadoVazio'
import { ArrowLeftIcon, CopyIcon, FileJsonIcon, PencilLineIcon, RefreshCwIcon, SparklesIcon, UploadIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import CampoFormulario from './componentes/CampoFormulario'
import Botao from './componentes/Botao'
import Notificacao from './componentes/Notificacao'
import {montarPromptDeQuestoes,MAXIMO_POR_LOTE} from './promptDeQuestoes'
type Props={token:string;onEncerrarSessao:(motivo?:string)=>void;onVoltar:()=>void}
export default function TelaAdminQuestoes({token,onEncerrarSessao,onVoltar}:Props){
 const [editais,setEditais]=useState<EditalAprovado[]>([]),[editalId,setEditalId]=useState(''),[revisoes,setRevisoes]=useState<RevisaoQuestao[]>([]),[ocupado,setOcupado]=useState(false),[erro,setErro]=useState<string|null>(null),[aviso,setAviso]=useState<string|null>(null),[tentativa,setTentativa]=useState(0)
 const [id,setId]=useState<number|undefined>(),[conteudoId,setConteudoId]=useState(''),[enunciado,setEnunciado]=useState(''),[alternativas,setAlternativas]=useState(['','','','']),[gabarito,setGabarito]=useState('0'),[explicacao,setExplicacao]=useState(''),[arquivo,setArquivo]=useState<QuestaoRascunho[]|null>(null)
 const [quantidade,setQuantidade]=useState('10'),[prompt,setPrompt]=useState(''),[colado,setColado]=useState('')
 function falhar(e:unknown){if(e instanceof SessaoEncerrada)onEncerrarSessao('Sua sessão expirou. Faça login novamente.');else setErro(e instanceof ErroDeApi?e.message:'Não foi possível concluir a operação. Tente novamente.')}
 useEffect(()=>{let cancelado=false;listarEditaisAprovados(token).then(e=>{if(!cancelado){setEditais(e);setErro(null)}}).catch(e=>{if(!cancelado){if(e instanceof SessaoEncerrada)onEncerrarSessao('Sua sessão expirou. Faça login novamente.');else setErro('Não foi possível carregar os editais. Tente novamente.')}});return()=>{cancelado=true}},[token,onEncerrarSessao,tentativa])
 useEffect(()=>{let cancelado=false;if(editalId)listarRevisoes(token,Number(editalId)).then(r=>{if(!cancelado)setRevisoes(r)}).catch(e=>{if(!cancelado){if(e instanceof SessaoEncerrada)onEncerrarSessao('Sua sessão expirou. Faça login novamente.');else setErro('Não foi possível carregar as questões.')}});return()=>{cancelado=true}},[token,editalId,onEncerrarSessao,tentativa])
 const edital=editais.find(e=>String(e.id)===editalId)
 const topicos=edital?.disciplinas.flatMap(d=>d.assuntos.flatMap(a=>a.subassuntos.length?a.subassuntos.map(c=>({id:c.id,nome:`${d.nome} — ${c.nome}`})):[{id:a.id,nome:`${d.nome} — ${a.nome}`}]))??[]
 function limpar(){setId(undefined);setConteudoId('');setEnunciado('');setAlternativas(['','','','']);setGabarito('0');setExplicacao('')}
 async function salvar(e:FormEvent){e.preventDefault();setErro(null);setAviso(null);if(!conteudoId||!enunciado.trim()||alternativas.some(a=>!a.trim())||!explicacao.trim()){setErro('Preencha o tópico, o enunciado, as quatro alternativas e a explicação.');return}setOcupado(true);try{await salvarQuestao(token,{editalId:Number(editalId),conteudoId:Number(conteudoId),enunciado,alternativas,gabarito:Number(gabarito),explicacao},id);setRevisoes(await listarRevisoes(token,Number(editalId)));limpar();setAviso('Rascunho salvo. Revise antes de publicar.')}catch(e){falhar(e)}finally{setOcupado(false)}}
 async function publicar(q:RevisaoQuestao){setErro(null);setAviso(null);setOcupado(true);try{await publicarQuestao(token,q.id);setRevisoes(await listarRevisoes(token,Number(editalId)));setAviso('Questão publicada para os alunos.')}catch(e){falhar(e)}finally{setOcupado(false)}}
 // Mesma validacao para arquivo e texto colado; aceita a resposta da IA dentro de ```json.
 function carregarLote(texto:string){try{const dados:unknown=JSON.parse(texto.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));if(!Array.isArray(dados)||!dados.length||dados.length>MAXIMO_POR_LOTE||dados.some(q=>!q||typeof q!=='object'||q.editalId!==Number(editalId)||!Number.isInteger(q.conteudoId)||typeof q.enunciado!=='string'||!Array.isArray(q.alternativas)||q.alternativas.length!==4||q.alternativas.some((a: unknown)=>typeof a!=='string')||!Number.isInteger(q.gabarito)||q.gabarito<0||q.gabarito>3||typeof q.explicacao!=='string'))throw new Error();setArquivo(dados as QuestaoRascunho[]);setAviso(`${dados.length} questões carregadas para importar como rascunhos.`)}catch{setErro('Use uma lista JSON válida de 1 a 50 questões vinculadas ao edital selecionado.')}}
 async function lerArquivo(f?:File){setArquivo(null);setErro(null);if(!f)return;if(f.size>1024*1024){setErro('Use um arquivo JSON de até 1 MB.');return}carregarLote(await f.text())}
 function gerarPrompt(){setErro(null);setAviso(null);if(!edital)return;const n=Number(quantidade);if(!Number.isInteger(n)||n<1||n>MAXIMO_POR_LOTE){setErro('Informe uma quantidade entre 1 e 50 questões.');return}setPrompt(montarPromptDeQuestoes({editalId:edital.id,curso:edital.titulo,topicos,existentes:revisoes,quantidade:n}))}
 async function copiarPrompt(){try{await navigator.clipboard.writeText(prompt);setAviso('Prompt copiado. Cole na IA de sua preferência e traga o JSON de volta.')}catch{setErro('Não foi possível copiar automaticamente. Selecione o texto do prompt e copie.')}}
 async function importar(){if(!arquivo)return;setOcupado(true);setErro(null);setAviso(null);try{await importarQuestoes(token,arquivo);setRevisoes(await listarRevisoes(token,Number(editalId)));setArquivo(null);setColado('');setAviso('Questões importadas como rascunhos. Revise cada uma antes de publicar.')}catch(e){falhar(e)}finally{setOcupado(false)}}
 const secao='flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm'
 const tituloDaSecao='flex items-center gap-2 text-base font-semibold'
 return <Conteudo largura="larga">
  <CabecalhoDaPagina sobretitulo="PAINEL DE GESTÃO" titulo="Revisão de questões" descricao="Cadastre e revise questões dos tópicos do edital antes de publicar."
   acoes={<><Botao type="button" variante="secundario" disabled={ocupado} onClick={()=>setTentativa(t=>t+1)}><RefreshCwIcon aria-hidden="true"/>Atualizar lista</Botao><Botao type="button" variante="secundario" disabled={ocupado} onClick={onVoltar}><ArrowLeftIcon aria-hidden="true"/>Voltar</Botao></>}/>
  {erro&&<Notificacao tipo="erro" mensagem={erro} onFechar={()=>setErro(null)}/>}{aviso&&<Notificacao tipo="sucesso" mensagem={aviso} onFechar={()=>setAviso(null)}/>}
  <CampoFormulario id="questao-edital" rotulo="Edital" className="w-full sm:max-w-md"><NativeSelect disabled={ocupado} value={editalId} onChange={e=>{setEditalId(e.target.value);setRevisoes([]);setArquivo(null);setPrompt('');setColado('');limpar();setErro(null);setAviso(null)}}><option value="">Selecione um edital</option>{editais.map(e=><option key={e.id} value={e.id}>{e.titulo}</option>)}</NativeSelect></CampoFormulario>
  {!edital&&<EstadoVazio>Selecione um edital para cadastrar, gerar ou revisar questões.</EstadoVazio>}
  {edital&&<>
   <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
   <form onSubmit={salvar} noValidate className={secao}><fieldset disabled={ocupado} className="flex min-w-0 flex-col gap-4 disabled:opacity-70"><legend className={cn(tituloDaSecao,'mb-4')}><PencilLineIcon className="size-4 text-primary" aria-hidden="true"/>{id?'Editar rascunho':'Nova questão'}</legend>
    <CampoFormulario id="questao-topico" rotulo="Tópico do edital"><NativeSelect value={conteudoId} onChange={e=>setConteudoId(e.target.value)}><option value="">Selecione um tópico</option>{topicos.map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}</NativeSelect></CampoFormulario>
    <CampoFormulario id="questao-enunciado" rotulo="Enunciado"><Textarea maxLength={10000} value={enunciado} onChange={e=>setEnunciado(e.target.value)}/></CampoFormulario>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{alternativas.map((a,n)=><CampoFormulario key={n} id={`questao-alternativa-${n}`} rotulo={`Alternativa ${String.fromCharCode(65+n)}`}><Textarea className="min-h-16" maxLength={2000} value={a} onChange={e=>setAlternativas(v=>v.map((x,i)=>i===n?e.target.value:x))}/></CampoFormulario>)}</div>
    <CampoFormulario id="questao-gabarito" rotulo="Gabarito" className="w-32"><NativeSelect value={gabarito} onChange={e=>setGabarito(e.target.value)}>{['A','B','C','D'].map((a,n)=><option key={a} value={n}>{a}</option>)}</NativeSelect></CampoFormulario>
    <CampoFormulario id="questao-explicacao" rotulo="Explicação da resposta"><Textarea maxLength={10000} value={explicacao} onChange={e=>setExplicacao(e.target.value)}/></CampoFormulario>
    <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:justify-end">{id&&<Botao type="button" variante="secundario" onClick={limpar}>Cancelar edição</Botao>}<Botao type="submit">Salvar rascunho</Botao></div>
   </fieldset></form>
   <div className="flex flex-col gap-6">
   <section className={secao}><h2 className={tituloDaSecao}><SparklesIcon className="size-4 text-primary" aria-hidden="true"/>Gerar questões com IA</h2><p className="text-sm text-muted-foreground">A plataforma monta um prompt com os tópicos que têm menos questões e com as questões já existentes, para a IA não repetir. Cole o prompt na IA de sua preferência e traga o JSON de volta abaixo.</p>
    <CampoFormulario id="questoes-quantidade" rotulo="Quantidade de questões (1 a 50)" className="w-full sm:w-56"><Input type="number" min={1} max={MAXIMO_POR_LOTE} value={quantidade} disabled={ocupado} onChange={e=>setQuantidade(e.target.value)}/></CampoFormulario>
    <div className="flex flex-wrap gap-2"><Botao type="button" variante="secundario" disabled={ocupado||!topicos.length} onClick={gerarPrompt}>{prompt?'Gerar outro prompt':'Gerar prompt'}</Botao>{prompt&&<Botao type="button" disabled={ocupado} onClick={()=>void copiarPrompt()}><CopyIcon aria-hidden="true"/>Copiar prompt</Botao>}</div>
    {prompt&&<CampoFormulario id="questoes-prompt" rotulo="Prompt para a IA"><Textarea readOnly rows={12} className="field-sizing-fixed font-mono text-xs" value={prompt}/></CampoFormulario>}
   </section>
   <section className={secao}><h2 className={tituloDaSecao}><FileJsonIcon className="size-4 text-primary" aria-hidden="true"/>Importar questões preparadas</h2><p className="text-sm text-muted-foreground">O JSON deve conter uma lista de questões com editalId, conteudoId, enunciado, quatro alternativas, gabarito (0 a 3) e explicacao. Todas entram como rascunhos.</p>
    <CampoFormulario id="questoes-colado" rotulo="Colar o JSON gerado pela IA"><Textarea rows={6} className="field-sizing-fixed font-mono text-xs" value={colado} disabled={ocupado} onChange={e=>setColado(e.target.value)}/></CampoFormulario>
    <Botao type="button" variante="secundario" className="self-start" disabled={!colado.trim()||ocupado} onClick={()=>{setArquivo(null);setErro(null);setAviso(null);carregarLote(colado)}}>Conferir JSON colado</Botao>
    <CampoFormulario id="questoes-json" rotulo="Ou envie um arquivo de questões revisáveis"><Input className="cursor-pointer py-1.5" type="file" accept=".json,application/json" disabled={ocupado} onChange={e=>void lerArquivo(e.target.files?.[0])}/></CampoFormulario><Botao type="button" className="self-start" disabled={!arquivo||ocupado} onClick={importar}><UploadIcon aria-hidden="true"/>Importar rascunhos</Botao></section>
   </div>
   </div>
   <section className="flex flex-col gap-4"><h2 className="text-lg font-semibold">Questões para revisão</h2>{!revisoes.length&&<EstadoVazio>Nenhuma questão cadastrada neste edital.</EstadoVazio>}
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{revisoes.map((r,i)=><article className={cn(secao,'gap-3 p-5')} key={r.id}>
     <h3 className="flex flex-wrap items-center gap-2 font-semibold">Questão {i+1} — {r.publicada?'Publicada':'Rascunho'}<Badge variant={r.publicada?'success':'warning'} aria-hidden="true">{r.publicada?'Publicada':'Rascunho'}</Badge></h3>
     <p className="text-xs font-medium text-muted-foreground">{topicos.find(t=>t.id===r.questao.conteudoId)?.nome}</p>
     <p className="text-sm leading-relaxed">{r.questao.enunciado}</p>
     <ol type="A" className="flex list-[upper-alpha] flex-col gap-1 pl-5 text-sm marker:font-semibold marker:text-muted-foreground">{r.questao.alternativas.map((a,n)=><li key={n} className={n===r.questao.gabarito?'font-medium text-success':undefined}>{a}</li>)}</ol>
     <p className="text-sm font-medium">Gabarito: {String.fromCharCode(65+r.questao.gabarito)}</p>
     <p className="text-sm text-muted-foreground">{r.questao.explicacao}</p>
     {!r.publicada&&<div className="mt-auto flex flex-col gap-2 border-t pt-3 sm:flex-row sm:flex-wrap"><Botao type="button" disabled={ocupado} variante="secundario" tamanho="pequeno" onClick={()=>{setId(r.id);setConteudoId(String(r.questao.conteudoId));setEnunciado(r.questao.enunciado);setAlternativas(r.questao.alternativas);setGabarito(String(r.questao.gabarito));setExplicacao(r.questao.explicacao);setAviso('Rascunho carregado no formulário para edição.')}}>Editar questão {i+1}</Botao><Botao type="button" disabled={ocupado} tamanho="pequeno" onClick={()=>publicar(r)}>Aprovar e publicar questão {i+1}</Botao></div>}
    </article>)}</div>
   </section>
  </>}
 </Conteudo>
}
