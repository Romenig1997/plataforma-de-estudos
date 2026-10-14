import { useEffect, useState } from 'react'
import { buscarAnalise, type Analise } from './analise'
import { ErroDeRede, SessaoEncerrada } from './sessao'
import Cartao from './componentes/Cartao'
import Botao from './componentes/Botao'
import Aviso from './componentes/Aviso'
import EstadoCarregando from './componentes/EstadoCarregando'
type Props = { token: string; onEncerrarSessao: (motivo?: string) => void; onVoltar: () => void; onIrParaDashboard: () => void }
const percentual = (n: number) => `${n.toLocaleString('pt-BR',{maximumFractionDigits:2})}%`
export default function TelaAnalise({token,onEncerrarSessao,onVoltar,onIrParaDashboard}: Props){
 const [dados,setDados]=useState<Analise|null>(null),[carregando,setCarregando]=useState(true),[erro,setErro]=useState<string|null>(null),[tentativa,setTentativa]=useState(0)
 useEffect(()=>{
  let cancelado=false
  buscarAnalise(token).then(d=>{if(!cancelado){setDados(d);setErro(null)}}).catch(e=>{
   if(cancelado)return
   if(e instanceof SessaoEncerrada){onEncerrarSessao('Sua sessão expirou. Faça login novamente.');return}
   setErro(e instanceof ErroDeRede?'Não foi possível conectar ao servidor. Tente novamente.':'Não foi possível carregar sua análise. Tente novamente.')
  }).finally(()=>{if(!cancelado)setCarregando(false)})
  return ()=>{cancelado=true}
 },[token,onEncerrarSessao,tentativa])
 return <main className="tela"><Cartao largo titulo="Análise de desempenho" descricao="Identifique dificuldades e orientações de estudo a partir das suas respostas.">
  {carregando&&<EstadoCarregando>Carregando análise...</EstadoCarregando>}{erro&&<Aviso tipo="erro">{erro}</Aviso>}
  {!carregando&&!erro&&!dados&&<p>Selecione e salve um plano semanal para analisar o edital.</p>}
  {dados&&<>
   <p>{dados.editalTitulo}</p>
   {dados.analise.desempenhoGeral===null?<><p role="status"><strong>Dados insuficientes para análise.</strong></p><p>Responda questões do seu edital para alimentar a análise com resultados corrigidos pelo sistema. Marcar tópicos como concluídos atualiza o progresso, mas não mede acertos.</p></>:<p>Desempenho geral: <strong>{percentual(dados.analise.desempenhoGeral)}</strong></p>}
   <section aria-labelledby="analise-disciplinas"><h2 id="analise-disciplinas">Desempenho por disciplina</h2>
    <ul className="dashboard-disciplinas">{dados.analise.disciplinas.map(d=><li key={d.id}><strong>{d.nome}</strong><p>{d.desempenho===null?'Sem dados':`${percentual(d.desempenho)} — ${d.acertos} acertos em ${d.questoes} questões`}</p>{d.abaixoDosDemais&&<p>Abaixo das demais disciplinas.</p>}</li>)}</ul>
   </section>
   <section aria-labelledby="analise-recomendacoes"><h2 id="analise-recomendacoes">Recomendações de estudo</h2>
    {!dados.analise.comparacaoDisponivel?<p>São necessárias respostas corrigidas em pelo menos duas disciplinas para comparar os resultados.</p>:dados.analise.recomendacoes.length?<ul className="dashboard-disciplinas">{dados.analise.recomendacoes.map(r=><li key={r.disciplinaId}>{r.mensagem}</li>)}</ul>:<p>Nenhuma disciplina está abaixo do desempenho das demais nos resultados disponíveis.</p>}
   </section>
   <p>A comparação usa acertos sobre questões respondidas nas outras disciplinas, ponderados pela quantidade de respostas. Disciplinas sem respostas não participam.</p>
  </>}
  <div className="acoes acoes--em-linha"><Botao type="button" variante="secundario" disabled={carregando} onClick={()=>{setCarregando(true);setTentativa(t=>t+1)}}>{erro?'Tentar novamente':'Atualizar análise'}</Botao><Botao type="button" variante="secundario" onClick={onIrParaDashboard}>Dashboard de estudos</Botao><Botao type="button" variante="secundario" onClick={onVoltar}>Voltar</Botao></div>
 </Cartao></main>
}
