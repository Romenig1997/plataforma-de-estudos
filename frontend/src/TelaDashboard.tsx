import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { buscarDashboard, salvarRegistro, type Dashboard, type Topico } from './dashboard'
import { ErroDeApi, ErroDeRede, SessaoEncerrada } from './sessao'
import { dataLegivel } from './cronograma'
import Cartao from './componentes/Cartao'
import Botao from './componentes/Botao'
import Aviso from './componentes/Aviso'
import CampoFormulario from './componentes/CampoFormulario'
import EstadoCarregando from './componentes/EstadoCarregando'

type Props = { token: string; onEncerrarSessao: (motivo?: string) => void; onVoltar: () => void; onIrParaPlanner: () => void; onIrParaCronograma: () => void }
const percentual = (n: number) => `${n.toLocaleString('pt-BR', {maximumFractionDigits:2})}%`
export default function TelaDashboard({token,onEncerrarSessao,onVoltar,onIrParaPlanner,onIrParaCronograma}: Props) {
 const [dados,setDados] = useState<Dashboard | null>(null)
 const [carregando,setCarregando] = useState(true), [salvando,setSalvando] = useState(false)
 const [erro,setErro] = useState<string | null>(null), [aviso,setAviso] = useState<string | null>(null)
 const [tentativa,setTentativa] = useState(0), [disciplinaId,setDisciplinaId] = useState(''), [topicoId,setTopicoId] = useState('')
 const [concluido,setConcluido] = useState(false)
 const [erros,setErros] = useState<Record<string,string>>({})
 const falhar = useCallback((e: unknown) => {
  if(e instanceof SessaoEncerrada){onEncerrarSessao('Sua sessão expirou. Faça login novamente.');return}
  if(e instanceof ErroDeApi){setErro(e.erros.map(x=>x.mensagem).join(' ') || 'Não foi possível salvar o registro. Tente novamente.');return}
  setErro(e instanceof ErroDeRede?'Não foi possível conectar ao servidor. Tente novamente.':'Não foi possível atualizar o painel. Tente novamente.')
 },[onEncerrarSessao])
 useEffect(()=>{
  let cancelado=false
  buscarDashboard(token).then(d=>{if(!cancelado){setDados(d);setErro(null)}}).catch(e=>{if(!cancelado)falhar(e)}).finally(()=>{if(!cancelado)setCarregando(false)})
  return ()=>{cancelado=true}
 },[token,tentativa,falhar])
 const disciplina=dados?.disciplinas.find(d=>String(d.id)===disciplinaId)
 function escolherTopico(id: string){
  setTopicoId(id);setErros({});setAviso(null)
  const t=disciplina?.topicos.find(t=>String(t.id)===id);setConcluido(t?.concluido??false)
 }
 async function salvar(e: FormEvent){
  e.preventDefault();setErro(null);setAviso(null)
  const validacao: Record<string,string>={}
  if(!topicoId)validacao.topico='Selecione um tópico.'
  setErros(validacao);if(Object.keys(validacao).length)return
  setSalvando(true)
  try{await salvarRegistro(token,Number(topicoId),{concluido});setAviso('Registro salvo.');setDados(await buscarDashboard(token))}
  catch(e){falhar(e)}finally{setSalvando(false)}
 }
 function atualizar(){setCarregando(true);setTentativa(t=>t+1)}
 return <main className="tela"><Cartao largo titulo="Dashboard de estudos" descricao="Acompanhe seu progresso, desempenho e próximas atividades.">
  {carregando&&<EstadoCarregando>Carregando painel...</EstadoCarregando>}
  {erro&&<Aviso tipo="erro">{erro}</Aviso>}{aviso&&<Aviso tipo="sucesso">{aviso}</Aviso>}
  {!carregando&&!erro&&!dados&&<p>Selecione e salve um plano semanal para acompanhar o edital.</p>}
  {dados&&<>
   <p>{dados.editalTitulo}</p>
   <section aria-labelledby="progresso-titulo"><h2 id="progresso-titulo">Progresso geral dos estudos</h2>
    <p><strong>{percentual(dados.progresso)}</strong> — {dados.topicosConcluidos} de {dados.totalTopicos} tópicos concluídos.</p>
    <progress aria-label="Progresso geral dos estudos" value={dados.topicosConcluidos} max={Math.max(1,dados.totalTopicos)} />
    <p>Conteúdos concluídos do edital selecionado. Grupos de tópicos não são contados em duplicidade.</p>
   </section>
   <section aria-labelledby="desempenho-titulo"><h2 id="desempenho-titulo">Desempenho por disciplina</h2><p>O percentual de acertos é calculado automaticamente a partir das suas respostas às questões.</p>
    <ul className="dashboard-disciplinas">{dados.disciplinas.map(d=><li key={d.id}><strong>{d.nome}</strong><p>{d.desempenho===null?'Sem dados':`${percentual(d.desempenho)} — ${d.acertos} acertos em ${d.questoes} questões`}</p></li>)}</ul>
   </section>
   <section aria-labelledby="proximas-titulo"><h2 id="proximas-titulo">Próximas atividades planejadas</h2>
    {dados.cronogramaDesatualizado&&<Aviso tipo="erro">Seu plano mudou. Gere novamente o cronograma para atualizar as atividades.</Aviso>}
    {!dados.proximasAtividades.length&&<p>Nenhuma atividade futura para os tópicos pendentes. Confira seu cronograma.</p>}
    <ol className="dashboard-atividades">{dados.proximasAtividades.map(a=><li key={a.id}><strong>{dataLegivel(a.data)} · {a.inicio.slice(0,5)}–{a.fim.slice(0,5)} · {a.disciplina}</strong><p>{a.conteudo} (pág. {a.pagina})</p></li>)}</ol>
   </section>
   <form onSubmit={salvar} noValidate>
    <fieldset disabled={salvando||carregando}><legend>Registrar estudos</legend>
     <p>Marque ou desmarque a conclusão do conteúdo estudado.</p>
     <CampoFormulario id="registro-disciplina" rotulo="Disciplina"><select value={disciplinaId} onChange={e=>{setDisciplinaId(e.target.value);setTopicoId('');setErros({});setAviso(null)}}><option value="">Selecione uma disciplina</option>{dados.disciplinas.map(d=><option key={d.id} value={d.id}>{d.nome}</option>)}</select></CampoFormulario>
     <CampoFormulario id="registro-topico" rotulo="Tópico" erro={erros.topico}><select value={topicoId} onChange={e=>escolherTopico(e.target.value)}><option value="">Selecione um tópico</option>{disciplina?.topicos.map((t: Topico)=><option key={t.id} value={t.id}>{t.nome}</option>)}</select></CampoFormulario>
     {topicoId&&<>
      <label className="dashboard-conclusao"><input type="checkbox" checked={concluido} onChange={e=>setConcluido(e.target.checked)} /> Tópico concluído</label>
     </>}
     <Botao type="submit">{salvando?'Salvando...':'Salvar registro'}</Botao>
    </fieldset>
   </form>
  </>}
  <div className="acoes acoes--em-linha">
   <Botao type="button" variante="secundario" onClick={atualizar} disabled={carregando||salvando}>{erro?'Tentar novamente':'Atualizar painel'}</Botao>
   <Botao type="button" variante="secundario" onClick={onIrParaPlanner} disabled={salvando}>Editar plano semanal</Botao>
   <Botao type="button" variante="secundario" onClick={onIrParaCronograma} disabled={salvando}>Cronograma de estudos</Botao>
   <Botao type="button" variante="secundario" onClick={onVoltar} disabled={salvando}>Voltar</Botao>
  </div>
 </Cartao></main>
}
