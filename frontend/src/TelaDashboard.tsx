import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { buscarDashboard, type Dashboard } from './dashboard'
import { buscarAnalise, type Analise } from './analise'
import { contar, diaRelativo, formatarPercentual } from './desempenho'
import { SessaoEncerrada } from './sessao'
import { useRecurso } from './useRecurso'
import Aviso from './componentes/Aviso'
import EstadoCarregando from './componentes/EstadoCarregando'
import { CabecalhoDaPagina, Conteudo, EstadoSemDados, Indicador } from './componentes/Pagina'
import { CalendarClockIcon, ChartNoAxesCombinedIcon, CrosshairIcon, FileCheck2Icon, TargetIcon, TrendingUpIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
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

  const linkSuave = 'font-medium text-primary hover:underline'
  return <Conteudo>
    <CabecalhoDaPagina
      sobretitulo="EVOLUIR"
      titulo="Desempenho"
      descricao={painel ? painel.editalTitulo : 'Acompanhe quanto você estudou e quanto está acertando.'}
      acoes={<>
        {painel && <Button asChild><Link to={`/curso/${painel.editalId}`}>Continuar estudando</Link></Button>}
        {erro
          ? <Button type="button" variant="outline" onClick={recarregar} disabled={carregando}>Tentar novamente</Button>
          : <Button asChild variant="outline"><Link to={praticar}>Praticar questões</Link></Button>}
      </>}
    />
    <SeletorDeCurso inscricoes={curso.inscricoes} editalAtual={painel?.editalId ?? curso.editalId} onEscolher={curso.escolher} />
    {carregando && <EstadoCarregando formato="pagina">Carregando painel...</EstadoCarregando>}
    {erro && <Aviso tipo="erro">{erro}</Aviso>}
    {!carregando && !erro && dados && !painel && <EstadoSemDados titulo="Você ainda não está inscrito em um curso" icone={<ChartNoAxesCombinedIcon />} acao={{ texto: 'Explorar cursos', para: '/app' }}>
      Inscreva-se em um curso para acompanhar seu progresso, seus acertos e sua agenda.
    </EstadoSemDados>}

    {painel && <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Indicador rotulo="Progresso" icone={<TrendingUpIcon />} valor={formatarPercentual(painel.progresso)}
          detalhe={<span className="flex flex-col gap-2">
            <Progress className="mt-1 h-1.5" aria-label="Progresso geral dos estudos" value={(100 * painel.topicosConcluidos) / Math.max(1, painel.totalTopicos)} />
            {painel.topicosConcluidos} de {contar(painel.totalTopicos, 'tópico concluído', 'tópicos concluídos')}
          </span>} />
        <Indicador rotulo="Acertos" icone={<TargetIcon />} valor={questoes ? formatarPercentual((100 * acertos) / questoes) : 'Sem respostas'}
          detalhe={questoes ? `${acertos} de ${contar(questoes, 'questão', 'questões')}` : <Link className={linkSuave} to={praticar}>Responder questões</Link>} />
        <Indicador rotulo="Questões respondidas" icone={<FileCheck2Icon />} valor={String(questoes)}
          detalhe={<Link className={linkSuave} to={praticar}>{questoes ? 'Praticar mais' : 'Começar a praticar'}</Link>} />
      </div>

      <Card role="region" className={cn('gap-4', foco && 'border-warning/40')} aria-labelledby="foco-titulo">
        <CardHeader>
          <CardTitle><h2 id="foco-titulo" className="flex items-center gap-2 text-base font-semibold"><CrosshairIcon className="size-4 text-primary" aria-hidden="true" />Onde focar agora</h2></CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          {foco
            ? <>
              <p><strong className="text-base">{foco.conteudo}</strong> <span className="text-muted-foreground">· {foco.disciplina}{acertoDoTopico.has(foco.conteudoId) && ` · ${formatarPercentual(acertoDoTopico.get(foco.conteudoId) ?? 0)} de acertos`}</span></p>
              <p className="text-muted-foreground">{foco.mensagem}</p>
              <Button asChild className="self-start"><Link to={praticarTopico(foco)}>Praticar {foco.conteudo}</Link></Button>
              {outrosFocos.length > 0 && <div className="mt-2 flex flex-col gap-2 border-t pt-4">
                <h3 id="foco-outros-titulo" className="font-semibold">Também vale revisar</h3>
                <ul className="flex flex-col gap-1.5" aria-labelledby="foco-outros-titulo">
                  {outrosFocos.map(r => <li key={r.conteudoId} className="text-muted-foreground">
                    <Link className={linkSuave} to={praticarTopico(r)}>Praticar {r.conteudo}</Link> · {r.disciplina}{acertoDoTopico.has(r.conteudoId) && ` · ${formatarPercentual(acertoDoTopico.get(r.conteudoId) ?? 0)} de acertos`}
                  </li>)}
                </ul>
              </div>}
            </>
            : analise?.comparacaoDisponivel
              ? <p className="text-muted-foreground">Seus acertos estão equilibrados entre os tópicos. Continue praticando para manter o ritmo.</p>
              : <p className="text-muted-foreground">Responda pelo menos {MINIMO_POR_TOPICO} questões em dois tópicos diferentes para comparar seus resultados e receber uma recomendação.</p>}
        </CardContent>
      </Card>

      <section className="flex flex-col gap-4" aria-labelledby="disciplinas-titulo">
        <h2 id="disciplinas-titulo" className="text-lg font-semibold">Por disciplina</h2>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {painel.disciplinas.map(d => <CartaoDeDisciplina key={d.id} disciplina={d} editalId={painel.editalId} abaixoDasDemais={abaixo.has(d.id)} />)}
        </ul>
        <p className="text-xs text-muted-foreground">Estudo conta os tópicos marcados como concluídos. Acertos consideram a última tentativa de cada questão.</p>
      </section>

      {painel.cronogramaDesatualizado && <Aviso tipo="atencao">Seu plano mudou. <Link to="/cronograma">Gere novamente o cronograma</Link> para atualizar as atividades.</Aviso>}
      <p className="flex flex-col gap-2 rounded-xl border bg-card p-4 text-sm sm:flex-row sm:items-center">
        <CalendarClockIcon className="hidden size-5 shrink-0 text-primary sm:block" aria-hidden="true" />
        <span className="flex-1">
          {proxima
            ? <><strong>Próxima sessão:</strong> {diaRelativo(proxima.data)}, {proxima.inicio.slice(0, 5)} · {proxima.disciplina} — {proxima.conteudo}</>
            : 'Nenhuma sessão futura no cronograma para os tópicos pendentes.'}
        </span>
        {' '}<Link className={linkSuave} to="/cronograma">Abrir cronograma</Link>
      </p>
    </>}
  </Conteudo>
}
