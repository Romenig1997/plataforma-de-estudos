import { useEffect,useState } from 'react'
import {listarQuestoes,responderQuestao,type QuestaoAluno} from './questoes'
import {ErroDeApi,ErroDeRede,SessaoEncerrada} from './sessao'
import Botao from './componentes/Botao'
import Cartao from './componentes/Cartao'
import Aviso from './componentes/Aviso'
import EstadoCarregando from './componentes/EstadoCarregando'
type Props={token:string;onEncerrarSessao:(motivo?:string)=>void;onVoltar:()=>void;onIrParaDashboard:()=>void}
export default function TelaQuestoes({token,onEncerrarSessao,onVoltar,onIrParaDashboard}:Props){
 const [questoes,setQuestoes]=useState<QuestaoAluno[]>([]),[carregando,setCarregando]=useState(true),[tentativa,setTentativa]=useState(0),[erro,setErro]=useState<string|null>(null),[salvando,setSalvando]=useState<number|null>(null),[escolhas,setEscolhas]=useState<Record<number,number>>({})
 useEffect(()=>{let cancelado=false;listarQuestoes(token).then(q=>{if(!cancelado){setQuestoes(q);setErro(null)}}).catch(e=>{if(cancelado)return;if(e instanceof SessaoEncerrada)onEncerrarSessao('Sua sessão expirou. Faça login novamente.');else setErro('Não foi possível carregar as questões. Tente novamente.')}).finally(()=>{if(!cancelado)setCarregando(false)});return()=>{cancelado=true}},[token,onEncerrarSessao,tentativa])
 async function responder(id:number){
  if(escolhas[id]===undefined){setErro('Selecione uma alternativa antes de responder.');return}
  setErro(null);setSalvando(id)
  try{const resposta=await responderQuestao(token,id,escolhas[id]);setQuestoes(q=>q.map(x=>x.id===id?{...x,resposta}:x))}
  catch(e){if(e instanceof SessaoEncerrada)onEncerrarSessao('Sua sessão expirou. Faça login novamente.');else setErro(e instanceof ErroDeApi?e.message:e instanceof ErroDeRede?'Não foi possível conectar ao servidor. Tente novamente.':'Não foi possível registrar a resposta.');if(e instanceof ErroDeApi&&e.status===409)setTentativa(t=>t+1)}
  finally{setSalvando(null)}
 }
 return <main className="tela"><Cartao largo titulo="Questões do edital" descricao="Responda e acompanhe a correção automática das suas questões.">
  {erro&&<Aviso tipo="erro">{erro}</Aviso>}{carregando&&<EstadoCarregando>Carregando questões...</EstadoCarregando>}
  {!carregando&&!erro&&!questoes.length&&<p>Nenhuma questão publicada para seu plano atual. Selecione um edital no planner ou aguarde a publicação pelo administrador.</p>}
  <p>A primeira resposta de cada questão compõe seu desempenho. Respostas corrigidas atualizam automaticamente o dashboard e a análise.</p>
  {questoes.map((q,i)=><section key={q.id} className="questao-cartao" aria-labelledby={`questao-${q.id}`}><h2 id={`questao-${q.id}`}>Questão {i+1}</h2><p>{q.conteudo}</p><p>{q.enunciado}</p>
   <fieldset disabled={!!q.resposta||salvando!==null}><legend>Alternativas da questão {i+1}</legend>{q.alternativas.map((a,n)=><label className="questao-alternativa" key={n}><input type="radio" name={`alternativa-${q.id}`} checked={(q.resposta?.alternativa??escolhas[q.id])===n} onChange={()=>setEscolhas(v=>({...v,[q.id]:n}))}/><span>{String.fromCharCode(65+n)}. {a}</span></label>)}</fieldset>
   {q.resposta?<div role="status"><p><strong>{q.resposta.correta?'Resposta correta.':'Resposta incorreta.'}</strong> Resposta registrada no seu desempenho.</p><p>Gabarito: {String.fromCharCode(65+q.resposta.gabarito)}.</p><p>{q.resposta.explicacao}</p></div>:<Botao type="button" disabled={salvando!==null} onClick={()=>responder(q.id)}>{salvando===q.id?'Corrigindo...':`Responder questão ${i+1}`}</Botao>}
  </section>)}
  <div className="acoes acoes--em-linha"><Botao type="button" variante="secundario" disabled={carregando||salvando!==null} onClick={()=>{setCarregando(true);setTentativa(t=>t+1)}}>{erro?'Tentar novamente':'Atualizar questões'}</Botao><Botao type="button" variante="secundario" disabled={salvando!==null} onClick={onIrParaDashboard}>Dashboard de estudos</Botao><Botao type="button" variante="secundario" disabled={salvando!==null} onClick={onVoltar}>Voltar</Botao></div>
 </Cartao></main>
}
