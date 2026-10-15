import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { buscarDashboard } from './dashboard'
import { dataLegivel } from './cronograma'
import { useRecurso } from './useRecurso'
import Aviso from './componentes/Aviso'
import EstadoCarregando from './componentes/EstadoCarregando'
import { CabecalhoDaPagina, EstadoSemDados, Indicador, Painel } from './componentes/Pagina'
import SeletorDeCurso from './componentes/SeletorDeCurso'
import { useCursoSelecionado } from './useCursoSelecionado'

type Props = { token: string; onEncerrarSessao: (motivo?: string) => void }

const percentual = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`

/**
 * Painel de desempenho do plano ativo. A conclusao de topicos e registrada na
 * tela do curso; aqui o aluno acompanha progresso, acertos e a agenda.
 */
export default function TelaDashboard({ token, onEncerrarSessao }: Props) {
  const curso = useCursoSelecionado(token, onEncerrarSessao)
  const carregar = useCallback(() => buscarDashboard(token, curso.editalId), [token, curso.editalId])
  const { dados, carregando, erro, recarregar } = useRecurso(carregar, onEncerrarSessao, 'Não foi possível atualizar o painel. Tente novamente.')

  const questoes = dados?.disciplinas.reduce((total, d) => total + d.questoes, 0) ?? 0
  const acertos = dados?.disciplinas.reduce((total, d) => total + d.acertos, 0) ?? 0
  const proxima = dados?.proximasAtividades[0]

  return <main className="tela tela-pagina">
    <CabecalhoDaPagina
      sobretitulo="EVOLUIR"
      titulo="Desempenho"
      descricao={dados ? dados.editalTitulo : 'Acompanhe seu progresso, seus acertos e as próximas atividades.'}
      acoes={<>
        {dados && <Link className="botao-link" to={`/curso/${dados.editalId}`}>Continuar estudando</Link>}
        <button type="button" className="botao-link botao-link--secundario" onClick={recarregar} disabled={carregando}>{erro ? 'Tentar novamente' : 'Atualizar painel'}</button>
      </>}
    />
    <SeletorDeCurso inscricoes={curso.inscricoes} editalAtual={dados?.editalId ?? curso.editalId} onEscolher={curso.escolher} />
    {carregando && <EstadoCarregando>Carregando painel...</EstadoCarregando>}
    {erro && <Aviso tipo="erro">{erro}</Aviso>}
    {!carregando && !erro && !dados && <EstadoSemDados titulo="Você ainda não está inscrito em um curso" acao={{ texto: 'Explorar cursos', para: '/app' }}>
      Inscreva-se em um curso para acompanhar seu progresso, seus acertos e sua agenda.
    </EstadoSemDados>}
    {dados && <>
      <div className="indicadores">
        <Indicador rotulo="Progresso geral" valor={percentual(dados.progresso)} detalhe={`${dados.topicosConcluidos} de ${dados.totalTopicos} tópicos concluídos`} />
        <Indicador rotulo="Acertos nas questões" valor={questoes ? percentual(Math.round((10000 * acertos) / questoes) / 100) : 'Sem respostas'} detalhe={questoes ? `${acertos} de ${questoes} questões` : <Link to={`/questoes?curso=${dados.editalId}`}>Responder questões</Link>} />
        <Indicador rotulo="Próxima atividade" valor={proxima ? `${proxima.inicio.slice(0, 5)}–${proxima.fim.slice(0, 5)}` : 'Nenhuma'} detalhe={proxima ? `${dataLegivel(proxima.data)} · ${proxima.disciplina}` : <Link to="/cronograma">Ver cronograma</Link>} />
      </div>
      <progress className="indicadores__barra" aria-label="Progresso geral dos estudos" value={dados.topicosConcluidos} max={Math.max(1, dados.totalTopicos)} />

      <div className="paineis">
        <Painel titulo="Desempenho por disciplina" id="desempenho-titulo" acao={<Link to={`/analise?curso=${dados.editalId}`}>Ver análise</Link>}>
          <ul className="lista-disciplinas">{dados.disciplinas.map(d => {
            const feitos = d.topicos.filter(t => t.concluido).length
            return <li key={d.id}>
              <div><strong>{d.nome}</strong><span>{feitos} de {d.topicos.length} tópicos</span></div>
              <p>{d.desempenho === null ? 'Sem dados' : `${percentual(d.desempenho)} — ${d.acertos} acertos em ${d.questoes} questões`}</p>
            </li>
          })}</ul>
          <p className="painel__nota">O percentual de acertos considera a primeira resposta de cada questão.</p>
        </Painel>

        <Painel titulo="Próximas atividades" id="proximas-titulo" acao={<Link to="/cronograma">Abrir cronograma</Link>}>
          {dados.cronogramaDesatualizado && <Aviso tipo="atencao">Seu plano mudou. <Link to="/cronograma">Gere novamente o cronograma</Link> para atualizar as atividades.</Aviso>}
          {!dados.proximasAtividades.length && <p>Nenhuma atividade futura para os tópicos pendentes. Confira seu cronograma.</p>}
          <ol className="lista-atividades">{dados.proximasAtividades.map(a => <li key={a.id}>
            <strong>{dataLegivel(a.data)} · {a.inicio.slice(0, 5)}–{a.fim.slice(0, 5)} · {a.disciplina}</strong>
            <p>{a.conteudo} (pág. {a.pagina})</p>
          </li>)}</ol>
        </Painel>
      </div>
      <p className="painel__nota">Para marcar um tópico como concluído, abra o curso e marque a aula estudada.</p>
    </>}
  </main>
}
