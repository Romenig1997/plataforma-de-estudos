import { useCallback, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { mensagemDaFalha } from './api'
import { buscarPlano, type Plano } from './planner'
import { listarQuestoes, responderQuestao, type QuestaoAluno } from './questoes'
import { ErroDeApi, SessaoEncerrada } from './sessao'
import { useRecurso } from './useRecurso'
import Aviso from './componentes/Aviso'
import Botao from './componentes/Botao'
import EstadoCarregando from './componentes/EstadoCarregando'
import { CabecalhoDaPagina, Conteudo, EstadoSemDados } from './componentes/Pagina'
import { ChartNoAxesCombinedIcon, ChevronLeftIcon, ChevronRightIcon, CircleCheckIcon, CircleXIcon, FileQuestionIcon, InfoIcon, RefreshCwIcon, RotateCcwIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardContent, CardHeader } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import SeletorDeCurso from './componentes/SeletorDeCurso'
import { useCursoSelecionado } from './useCursoSelecionado'
import { embaralhar } from './embaralhar'

type Props = { token: string; onEncerrarSessao: (motivo?: string) => void }
/** `ordens[id]` guarda, por posicao na tela, o indice original de cada alternativa. */
type DadosDasQuestoes = { questoes: QuestaoAluno[]; plano: Plano | null; ordens: Record<number, number[]> }

const POR_PAGINA = 10
const INDICES = [0, 1, 2, 3]
const letra = (posicao: number) => String.fromCharCode(65 + posicao)

/** Nova ordem a cada visita: primeiro as nao respondidas, cada grupo embaralhado. */
function ordenarParaPraticar(questoes: QuestaoAluno[]): QuestaoAluno[] {
  return [...embaralhar(questoes.filter(q => !q.resposta)), ...embaralhar(questoes.filter(q => q.resposta))]
}

/** Disciplina de cada conteudo do edital, para filtrar o caderno. */
function disciplinaPorConteudo(plano: Plano | null): Map<number, number> {
  const mapa = new Map<number, number>()
  plano?.edital.disciplinas.forEach(disciplina => disciplina.assuntos.forEach(assunto => {
    mapa.set(assunto.id, disciplina.id)
    assunto.subassuntos.forEach(sub => mapa.set(sub.id, disciplina.id))
  }))
  return mapa
}

export default function TelaQuestoes({ token, onEncerrarSessao }: Props) {
  const [parametros, setParametros] = useSearchParams()
  const curso = useCursoSelecionado(token, onEncerrarSessao)
  const carregar = useCallback(async (): Promise<DadosDasQuestoes> => {
    const [questoes, plano] = await Promise.all([
      listarQuestoes(token, curso.editalId),
      // O plano so serve ao filtro: sem ele o caderno continua funcionando.
      buscarPlano(token, curso.editalId).catch((falha: unknown) => {
        if (falha instanceof SessaoEncerrada) throw falha
        return null
      }),
    ])
    const ordens: Record<number, number[]> = {}
    questoes.forEach(q => { ordens[q.id] = embaralhar(INDICES) })
    return { questoes: ordenarParaPraticar(questoes), plano, ordens }
  }, [token, curso.editalId])
  const { dados, definirDados, carregando, erro, recarregar } = useRecurso(carregar, onEncerrarSessao, 'Não foi possível carregar as questões. Tente novamente.')
  const [escolhas, setEscolhas] = useState<Record<number, number>>({})
  const [errosPorQuestao, setErrosPorQuestao] = useState<Record<number, string>>({})
  const [salvando, setSalvando] = useState<number | null>(null)
  const [refazendo, setRefazendo] = useState<Record<number, boolean>>({})
  // Respondidas nesta visita: refazer so fica disponivel numa proxima visita.
  const [respondidasAgora, setRespondidasAgora] = useState<Record<number, boolean>>({})

  const questoes = useMemo(() => dados?.questoes ?? [], [dados])
  const plano = dados?.plano ?? null
  const disciplinas = plano?.edital.disciplinas ?? []
  const mapa = useMemo(() => disciplinaPorConteudo(plano), [plano])
  const filtro = Number(parametros.get('disciplina')) || null
  const filtroValido = filtro !== null && disciplinas.some(d => d.id === filtro) ? filtro : null
  const daDisciplina = filtroValido ? questoes.filter(q => mapa.get(q.conteudoId) === filtroValido) : questoes
  // Topico vindo de "Onde focar agora"; so vale se tiver questoes na disciplina escolhida.
  const topico = Number(parametros.get('topico')) || null
  const topicoValido = topico !== null && daDisciplina.some(q => q.conteudoId === topico) ? topico : null
  const nomeDoTopico = topicoValido !== null ? daDisciplina.find(q => q.conteudoId === topicoValido)?.conteudo : undefined
  const visiveis = topicoValido !== null ? daDisciplina.filter(q => q.conteudoId === topicoValido) : daDisciplina
  const totalPaginas = Math.max(1, Math.ceil(visiveis.length / POR_PAGINA))
  const pagina = Math.min(totalPaginas, Math.max(1, Number(parametros.get('pagina')) || 1))
  const daPagina = visiveis.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)
  const respondidas = visiveis.filter(q => q.resposta).length
  const corretas = visiveis.filter(q => q.resposta?.correta).length

  function atualizarParametros(alteracoes: Record<string, string | null>) {
    const novos = new URLSearchParams(parametros)
    Object.entries(alteracoes).forEach(([chave, valor]) => (valor ? novos.set(chave, valor) : novos.delete(chave)))
    setParametros(novos)
  }

  async function responder(id: number) {
    if (escolhas[id] === undefined) {
      setErrosPorQuestao(atual => ({ ...atual, [id]: 'Selecione uma alternativa antes de responder.' }))
      return
    }
    setErrosPorQuestao(atual => ({ ...atual, [id]: '' }))
    setSalvando(id)
    try {
      const resposta = await responderQuestao(token, id, escolhas[id])
      definirDados(dados && { ...dados, questoes: dados.questoes.map(q => (q.id === id ? { ...q, resposta, tentativas: (q.tentativas ?? 0) + 1 } : q)) })
      setRefazendo(atual => ({ ...atual, [id]: false }))
      setRespondidasAgora(atual => ({ ...atual, [id]: true }))
    } catch (falha: unknown) {
      const mensagem = mensagemDaFalha(falha, onEncerrarSessao, 'Não foi possível registrar a resposta.')
      if (mensagem) setErrosPorQuestao(atual => ({ ...atual, [id]: mensagem }))
      // 409: a questao ja foi respondida em outra aba; recarrega o estado real.
      if (falha instanceof ErroDeApi && falha.status === 409) recarregar()
    } finally {
      setSalvando(null)
    }
  }

  /** Libera a questao para nova tentativa, com as alternativas em outra ordem. */
  function refazer(id: number) {
    setRefazendo(atual => ({ ...atual, [id]: true }))
    setEscolhas(atual => { const novas = { ...atual }; delete novas[id]; return novas })
    setErrosPorQuestao(atual => ({ ...atual, [id]: '' }))
    definirDados(dados && { ...dados, ordens: { ...dados.ordens, [id]: embaralhar(INDICES) } })
  }

  return <Conteudo largura="estreita">
    <CabecalhoDaPagina
      sobretitulo="PRATICAR"
      titulo="Questões do edital"
      descricao="Responda e acompanhe a correção automática das suas questões."
      acoes={<>
        <Button asChild><Link to={plano ? `/dashboard?curso=${plano.edital.id}` : '/dashboard'}><ChartNoAxesCombinedIcon aria-hidden="true" />Ver desempenho</Link></Button>
        <Button type="button" variant="outline" disabled={carregando || salvando !== null} onClick={recarregar}><RefreshCwIcon aria-hidden="true" />{erro ? 'Tentar novamente' : 'Atualizar questões'}</Button>
      </>}
    />
    <SeletorDeCurso inscricoes={curso.inscricoes} editalAtual={plano?.edital.id ?? curso.editalId} onEscolher={curso.escolher} />
    {erro && <Aviso tipo="erro">{erro}</Aviso>}
    {carregando && <EstadoCarregando formato="formulario">Carregando questões...</EstadoCarregando>}
    {!carregando && !erro && !questoes.length && <EstadoSemDados titulo="Nenhuma questão por aqui ainda" icone={<FileQuestionIcon />} acao={{ texto: 'Explorar cursos', para: '/app' }}>
      Nenhuma questão publicada para este curso. Inscreva-se em outro curso ou aguarde a publicação pelo administrador.
    </EstadoSemDados>}

    {questoes.length > 0 && <>
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-xs sm:flex-row sm:items-end sm:justify-between">
        {disciplinas.length > 0 && <div className="flex w-full flex-col gap-2 sm:max-w-xs">
          <Label htmlFor="filtro-disciplina">Disciplina</Label>
          <NativeSelect id="filtro-disciplina" value={filtroValido ?? ''} onChange={evento => atualizarParametros({ disciplina: evento.target.value || null, topico: null, pagina: null })}>
            <option value="">Todas as disciplinas</option>
            {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
          </NativeSelect>
        </div>}
        <div className="flex flex-col gap-1 sm:items-end">
          <p className="text-sm text-muted-foreground" aria-live="polite"><strong className="text-foreground">{respondidas} de {visiveis.length}</strong> respondidas{respondidas > 0 && ` · ${corretas} corretas`}</p>
          <Progress value={visiveis.length ? (100 * respondidas) / visiveis.length : 0} className="h-1.5 w-full sm:w-48" aria-hidden="true" />
        </div>
      </div>
      {nomeDoTopico && <p className="flex flex-col gap-2 rounded-lg border border-info/25 bg-info-soft px-4 py-3 text-sm text-info sm:flex-row sm:items-center sm:justify-between">
        <span>Filtrando pelo tópico: <strong>{nomeDoTopico}</strong></span>
        <Button type="button" variant="outline" size="sm" onClick={() => atualizarParametros({ topico: null, pagina: null })}>Ver todos os tópicos</Button>
      </p>}
      <p className="flex gap-2 text-xs text-muted-foreground"><InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />A ordem das questões e das alternativas muda a cada visita. Questões respondidas podem ser refeitas em uma próxima visita; a última tentativa compõe seu desempenho.</p>
      {!visiveis.length && <p role="status" className="rounded-xl border border-dashed px-6 py-8 text-center text-sm text-muted-foreground">Nenhuma questão publicada para esta disciplina.</p>}

      {daPagina.map(q => {
        const numero = visiveis.indexOf(q) + 1
        const erroDaQuestao = errosPorQuestao[q.id]
        const ordem = dados?.ordens[q.id] ?? INDICES
        // Respondida e sem nova tentativa: mostra a correcao da ultima tentativa.
        const corrigida = q.resposta && !refazendo[q.id] ? q.resposta : null
        const marcada = corrigida ? corrigida.alternativa : escolhas[q.id]
        return <section key={q.id} className="flex flex-col gap-5 rounded-xl border bg-card py-6 text-card-foreground shadow-sm" aria-labelledby={`questao-${q.id}`}>
          <CardHeader className="gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id={`questao-${q.id}`} className="text-sm font-bold tracking-wide text-primary uppercase">Questão {numero}</h2>
              <Badge variant="secondary">{q.conteudo}</Badge>
            </div>
            <p className="text-base leading-relaxed">{q.enunciado}</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <fieldset className="flex min-w-0 flex-col gap-2" disabled={Boolean(corrigida) || salvando !== null} aria-describedby={erroDaQuestao ? `questao-${q.id}-erro` : undefined}>
              <legend className="sr-only">Alternativas da questão {numero}</legend>
              {ordem.map((original, posicao) => {
                const certa = corrigida && corrigida.gabarito === original
                const errada = corrigida && !corrigida.correta && corrigida.alternativa === original
                return <label key={original} className={cn(
                  'relative flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50 has-checked:border-primary has-checked:bg-accent has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50 has-disabled:cursor-default',
                  certa && 'border-success bg-success-soft has-checked:border-success has-checked:bg-success-soft',
                  errada && 'border-destructive bg-destructive-soft has-checked:border-destructive has-checked:bg-destructive-soft',
                )}>
                  <input className="absolute inset-0 z-10 cursor-pointer appearance-none rounded-lg opacity-0 disabled:cursor-default" type="radio" name={`alternativa-${q.id}`} checked={marcada === original} onChange={() => { setEscolhas(atual => ({ ...atual, [q.id]: original })); setErrosPorQuestao(atual => ({ ...atual, [q.id]: '' })) }} />
                  <span aria-hidden="true" className={cn('flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold', marcada === original ? 'border-primary bg-primary text-primary-foreground' : 'bg-card', certa && 'border-success bg-success text-white', errada && 'border-destructive bg-destructive text-white', 'before:content-[attr(data-letra)]')} data-letra={letra(posicao)} />
                  <span className="pt-0.5 leading-relaxed"><span className="sr-only">{letra(posicao)}. </span>{q.alternativas[original]}</span>
                </label>
              })}
            </fieldset>
            {erroDaQuestao && <p id={`questao-${q.id}-erro`} className="text-sm font-medium text-destructive" role="alert">{erroDaQuestao}</p>}
            {corrigida
              ? <>
                <div role="status" className={cn('flex flex-col gap-2 rounded-lg border p-4 text-sm', corrigida.correta ? 'border-success/30 bg-success-soft' : 'border-destructive/30 bg-destructive-soft')}>
                  <p className={cn('flex items-center gap-2', corrigida.correta ? 'text-success' : 'text-destructive')}>{corrigida.correta ? <CircleCheckIcon className="size-4 shrink-0" aria-hidden="true" /> : <CircleXIcon className="size-4 shrink-0" aria-hidden="true" />}<span><strong>{corrigida.correta ? 'Resposta correta.' : 'Resposta incorreta.'}</strong> Resposta registrada no seu desempenho{(q.tentativas ?? 1) > 1 && ` (tentativa ${q.tentativas})`}.</span></p>
                  <p className="font-medium">Gabarito: {letra(ordem.indexOf(corrigida.gabarito))}.</p>
                  <p className="leading-relaxed text-muted-foreground">{corrigida.explicacao}</p>
                </div>
                {!respondidasAgora[q.id] && <Botao type="button" variante="secundario" className="self-start" disabled={salvando !== null} onClick={() => refazer(q.id)}><RotateCcwIcon aria-hidden="true" />{`Refazer questão ${numero}`}</Botao>}
              </>
              : <Botao type="button" className="self-start" disabled={salvando !== null} carregando={salvando === q.id} onClick={() => responder(q.id)}>{salvando === q.id ? 'Corrigindo...' : `Responder questão ${numero}`}</Botao>}
          </CardContent>
        </section>
      })}

      {totalPaginas > 1 && <nav className="flex items-center justify-between gap-3" aria-label="Páginas de questões">
        <Button type="button" variant="outline" disabled={pagina === 1} onClick={() => atualizarParametros({ pagina: String(pagina - 1) })}><ChevronLeftIcon aria-hidden="true" />Anterior</Button>
        <span className="text-sm text-muted-foreground">Página {pagina} de {totalPaginas}</span>
        <Button type="button" variant="outline" disabled={pagina === totalPaginas} onClick={() => atualizarParametros({ pagina: String(pagina + 1) })}>Próxima<ChevronRightIcon aria-hidden="true" /></Button>
      </nav>}
    </>}
  </Conteudo>
}
