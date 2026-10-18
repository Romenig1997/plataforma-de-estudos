import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { buscarDashboard, type Dashboard } from './dashboard'
import { buscarAnalise, type Analise } from './analise'
import { contar, diaRelativo, formatarPercentual } from './desempenho'
import { SessaoEncerrada } from './sessao'
import { useRecurso } from './useRecurso'
import Aviso from './componentes/Aviso'
import EstadoCarregando from './componentes/EstadoCarregando'
import { CabecalhoDaPagina, EstadoSemDados, Indicador } from './componentes/Pagina'
import SeletorDeCurso from './componentes/SeletorDeCurso'
import CartaoDeDisciplina from './componentes/CartaoDeDisciplina'
import { useCursoSelecionado } from './useCursoSelecionado'

type Props = { token: string; onEncerrarSessao: (motivo?: string) => void }
/** Igual a AnalisadorDesempenho.MINIMO_POR_TOPICO no backend. */
const MINIMO_POR_TOPICO = 3
type DadosDoDesempenho ={ painel: Dashboard | null; analise: Analise['analise'] | null }

/**
 * Desempenho do curso: resumo, onde focar (analise), estudo e acertos por
 * disciplina e a proxima sessao. Reune o que antes ficava em Desempenho e Analise.
 */
export default function TelaDashboard({ token, onEncerrarSessao }: Props) {
  const curso = useCursoSelecionado(token, onEncerrarSessao)
  const carregar = useCallback(async (): Promise<DadosDoDesempenho> => {
    const [painel, analise] = await Promise.all([
      buscarDashboard(token, curso.editalId),
      // A analise so complementa o painel: se falhar, a pagina continua util.
      buscarAnalise(token, curso.editalId).catch((falha: unknown) => {
        if (falha instanceof SessaoEncerrada) throw falha
        return null
      }),
    ])
    return { painel, analise: analise?.analise ?? null }
  }, [token, curso.editalId])
  const { dados, carregando, erro, recarregar } = useRecurso(carregar, onEncerrarSessao, 'Não foi possível atualizar o painel. Tente novamente.')
  const painel = dados?.painel ?? null
  const analise = dados?.analise ?? null

  const questoes = painel?.disciplinas.reduce((total, d) => total + d.questoes, 0) ?? 0
  const acertos = painel?.disciplinas.reduce((total, d) => total + d.acertos, 0) ?? 0
  const proxima = painel?.proximasAtividades[0]
  const abaixo = new Set((analise?.disciplinas ?? []).filter(d => d.abaixoDosDemais).map(d => d.id))
  const [foco, ...outrosFocos] = analise?.comparacaoDisponivel ? analise.recomendacoes : []
  const acertoDoTopico = new Map((analise?.topicos ?? []).map(t => [t.id, t.desempenho]))
  const praticar = painel ? `/questoes?curso=${painel.editalId}` : '/questoes'
  const praticarTopico = (r: { disciplinaId: number; conteudoId: number }) => `${praticar}&disciplina=${r.disciplinaId}&topico=${r.conteudoId}`

  return <main className="tela tela-pagina">
    <CabecalhoDaPagina
      sobretitulo="EVOLUIR"
      titulo="Desempenho"
      descricao={painel ? painel.editalTitulo : 'Acompanhe quanto você estudou e quanto está acertando.'}
      acoes={<>
        {painel && <Link className="botao-link" to={`/curso/${painel.editalId}`}>Continuar estudando</Link>}
        {erro
          ? <button type="button" className="botao-link botao-link--secundario" onClick={recarregar} disabled={carregando}>Tentar novamente</button>
          : <Link className="botao-link botao-link--secundario" to={praticar}>Praticar questões</Link>}
      </>}
    />
    <SeletorDeCurso inscricoes={curso.inscricoes} editalAtual={painel?.editalId ?? curso.editalId} onEscolher={curso.escolher} />
    {carregando && <EstadoCarregando>Carregando painel...</EstadoCarregando>}
    {erro && <Aviso tipo="erro">{erro}</Aviso>}
    {!carregando && !erro && dados && !painel && <EstadoSemDados titulo="Você ainda não está inscrito em um curso" acao={{ texto: 'Explorar cursos', para: '/app' }}>
      Inscreva-se em um curso para acompanhar seu progresso, seus acertos e sua agenda.
    </EstadoSemDados>}

    {painel && <>
      <div className="indicadores">
        <Indicador rotulo="Progresso" valor={formatarPercentual(painel.progresso)}
          detalhe={<>
            <progress className="indicador__barra" aria-label="Progresso geral dos estudos" value={painel.topicosConcluidos} max={Math.max(1, painel.totalTopicos)} />
            {painel.topicosConcluidos} de {contar(painel.totalTopicos, 'tópico concluído', 'tópicos concluídos')}
          </>} />
        <Indicador rotulo="Acertos" valor={questoes ? formatarPercentual((100 * acertos) / questoes) : 'Sem respostas'}
          detalhe={questoes ? `${acertos} de ${contar(questoes, 'questão', 'questões')}` : <Link to={praticar}>Responder questões</Link>} />
        <Indicador rotulo="Questões respondidas" valor={String(questoes)}
          detalhe={<Link to={praticar}>{questoes ? 'Praticar mais' : 'Começar a praticar'}</Link>} />
      </div>

      <section className={foco ? 'foco-estudo foco-estudo--alerta' : 'foco-estudo'} aria-labelledby="foco-titulo">
        <h2 id="foco-titulo">Onde focar agora</h2>
        {foco
          ? <>
            <p><strong>{foco.conteudo}</strong> · {foco.disciplina}{acertoDoTopico.has(foco.conteudoId) && ` · ${formatarPercentual(acertoDoTopico.get(foco.conteudoId) ?? 0)} de acertos`}</p>
            <p>{foco.mensagem}</p>
            <Link className="botao-link" to={praticarTopico(foco)}>Praticar {foco.conteudo}</Link>
            {outrosFocos.length > 0 && <div className="foco-estudo__outros">
              <h3 id="foco-outros-titulo">Também vale revisar</h3>
              <ul aria-labelledby="foco-outros-titulo">
                {outrosFocos.map(r => <li key={r.conteudoId}>
                  <Link to={praticarTopico(r)}>Praticar {r.conteudo}</Link> · {r.disciplina}{acertoDoTopico.has(r.conteudoId) && ` · ${formatarPercentual(acertoDoTopico.get(r.conteudoId) ?? 0)} de acertos`}
                </li>)}
              </ul>
            </div>}
          </>
          : analise?.comparacaoDisponivel
            ? <p>Seus acertos estão equilibrados entre os tópicos. Continue praticando para manter o ritmo.</p>
            : <p>Responda pelo menos {MINIMO_POR_TOPICO} questões em dois tópicos diferentes para comparar seus resultados e receber uma recomendação.</p>}
      </section>

      <section className="painel" aria-labelledby="disciplinas-titulo">
        <header className="painel__cabecalho"><h2 id="disciplinas-titulo">Por disciplina</h2></header>
        <ul className="cartoes-disciplina">
          {painel.disciplinas.map(d => <CartaoDeDisciplina key={d.id} disciplina={d} editalId={painel.editalId} abaixoDasDemais={abaixo.has(d.id)} />)}
        </ul>
        <p className="painel__nota">Estudo conta os tópicos marcados como concluídos. Acertos consideram a última tentativa de cada questão.</p>
      </section>

      {painel.cronogramaDesatualizado && <Aviso tipo="atencao">Seu plano mudou. <Link to="/cronograma">Gere novamente o cronograma</Link> para atualizar as atividades.</Aviso>}
      <p className="proxima-sessao">
        {proxima
          ? <><strong>Próxima sessão:</strong> {diaRelativo(proxima.data)}, {proxima.inicio.slice(0, 5)} · {proxima.disciplina} — {proxima.conteudo}</>
          : 'Nenhuma sessão futura no cronograma para os tópicos pendentes.'}
        {' '}<Link to="/cronograma">Abrir cronograma</Link>
      </p>
    </>}
  </main>
}
