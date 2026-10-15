import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { buscarAnalise } from './analise'
import { useRecurso } from './useRecurso'
import Aviso from './componentes/Aviso'
import EstadoCarregando from './componentes/EstadoCarregando'
import { CabecalhoDaPagina, EstadoSemDados, Indicador, Painel } from './componentes/Pagina'
import SeletorDeCurso from './componentes/SeletorDeCurso'
import { useCursoSelecionado } from './useCursoSelecionado'

type Props = { token: string; onEncerrarSessao: (motivo?: string) => void }

const percentual = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`

export default function TelaAnalise({ token, onEncerrarSessao }: Props) {
  const curso = useCursoSelecionado(token, onEncerrarSessao)
  const carregar = useCallback(() => buscarAnalise(token, curso.editalId), [token, curso.editalId])
  const { dados, carregando, erro, recarregar } = useRecurso(carregar, onEncerrarSessao, 'Não foi possível carregar sua análise. Tente novamente.')
  const analise = dados?.analise

  return <main className="tela tela-pagina">
    <CabecalhoDaPagina
      sobretitulo="EVOLUIR"
      titulo="Análise de desempenho"
      descricao={dados ? dados.editalTitulo : 'Identifique dificuldades e receba orientações a partir das suas respostas.'}
      acoes={<>
        <Link className="botao-link" to={dados ? `/questoes?curso=${dados.editalId}` : '/questoes'}>Praticar questões</Link>
        <button type="button" className="botao-link botao-link--secundario" onClick={recarregar} disabled={carregando}>{erro ? 'Tentar novamente' : 'Atualizar análise'}</button>
      </>}
    />
    <SeletorDeCurso inscricoes={curso.inscricoes} editalAtual={dados?.editalId ?? curso.editalId} onEscolher={curso.escolher} />
    {carregando && <EstadoCarregando>Carregando análise...</EstadoCarregando>}
    {erro && <Aviso tipo="erro">{erro}</Aviso>}
    {!carregando && !erro && !dados && <EstadoSemDados titulo="Você ainda não está inscrito em um curso" acao={{ texto: 'Explorar cursos', para: '/app' }}>
      Inscreva-se em um curso para analisar seu desempenho.
    </EstadoSemDados>}
    {analise && <>
      {analise.desempenhoGeral === null
        ? <EstadoSemDados titulo="Dados insuficientes para análise." acao={{ texto: 'Responder questões', para: `/questoes?curso=${dados?.editalId ?? ''}` }}>
          Responda questões do seu edital para alimentar a análise com resultados corrigidos. Marcar tópicos como concluídos atualiza o progresso, mas não mede acertos.
        </EstadoSemDados>
        : <div className="indicadores"><Indicador rotulo="Desempenho geral" valor={percentual(analise.desempenhoGeral)} detalhe="Acertos sobre as questões respondidas" /></div>}

      <div className="paineis">
        <Painel titulo="Desempenho por disciplina" id="analise-disciplinas" acao={<Link to={`/dashboard?curso=${dados?.editalId ?? ''}`}>Ver desempenho</Link>}>
          <ul className="lista-disciplinas">{analise.disciplinas.map(d => <li key={d.id} className={d.abaixoDosDemais ? 'lista-disciplinas__item--alerta' : undefined}>
            <div><strong>{d.nome}</strong>{d.abaixoDosDemais && <span className="selo selo--alerta">Abaixo das demais disciplinas.</span>}</div>
            <p>{d.desempenho === null ? 'Sem dados' : `${percentual(d.desempenho)} — ${d.acertos} acertos em ${d.questoes} questões`}</p>
            {d.abaixoDosDemais && <Link to={`/questoes?curso=${dados?.editalId ?? ''}&disciplina=${d.id}`}>Praticar {d.nome}</Link>}
          </li>)}</ul>
        </Painel>

        <Painel titulo="Recomendações de estudo" id="analise-recomendacoes">
          {!analise.comparacaoDisponivel
            ? <p>São necessárias respostas corrigidas em pelo menos duas disciplinas para comparar os resultados.</p>
            : analise.recomendacoes.length
              ? <ul className="lista-recomendacoes">{analise.recomendacoes.map(r => <li key={r.disciplinaId}>{r.mensagem}</li>)}</ul>
              : <p>Nenhuma disciplina está abaixo do desempenho das demais nos resultados disponíveis.</p>}
          <p className="painel__nota">A comparação usa acertos sobre questões respondidas nas outras disciplinas, ponderados pela quantidade de respostas. Disciplinas sem respostas não participam.</p>
        </Painel>
      </div>
    </>}
  </main>
}
