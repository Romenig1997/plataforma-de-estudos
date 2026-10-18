import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { mensagemDaFalha } from './api'
import { inscrever } from './cursos'
import { buscarDashboard, salvarRegistro, type Dashboard } from './dashboard'
import { baixarPdfDoEdital, listarEditaisAprovados, type ConteudoAprovado, type EditalAprovado } from './editais'
import { useRecurso } from './useRecurso'
import Aviso from './componentes/Aviso'
import Notificacao from './componentes/Notificacao'
import EstadoCarregando from './componentes/EstadoCarregando'
import AulaRow from './componentes/AulaRow'
import EstadoDePagina from './componentes/EstadoDePagina'
import { Conteudo } from './componentes/Pagina'
import { ArrowLeftIcon, CheckIcon, ChevronDownIcon, FileTextIcon, MaximizeIcon, MinimizeIcon, NotebookPenIcon, PlayIcon, SearchXIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

type Props = { token: string; onEncerrarSessao: (motivo?: string) => void }

/** Aula = topico final do edital (sem subassuntos), o mesmo que o backend registra. */
type Aula = { id: number; nome: string; pagina: number; numero: number }
type ItemDaLista = { tipo: 'grupo'; nome: string; chave: string } | { tipo: 'aula'; aula: Aula }
type DisciplinaDoCurso = { id: number; nome: string; itens: ItemDaLista[]; aulas: Aula[] }
type DadosDoCurso = { editais: EditalAprovado[]; painel: Dashboard | null }

function urlDaPagina(pdfUrl: string, pagina: number) {
  return `${pdfUrl.split('#')[0]}#page=${Math.max(1, pagina)}`
}

const ICONES = { play: PlayIcon, chevron: ChevronDownIcon, arquivo: FileTextIcon, caderno: NotebookPenIcon, expandir: MaximizeIcon, recolher: MinimizeIcon }

function Icone({ nome, className }: { nome: keyof typeof ICONES; className?: string }) {
  const Componente = ICONES[nome]
  return <Componente className={cn('size-4', className)} aria-hidden="true" />
}

/**
 * Lista de aulas de uma disciplina: assuntos com subassuntos viram um grupo
 * (titulo) seguido das aulas; assuntos sem subassuntos ja sao aulas.
 */
function montarDisciplina(disciplina: EditalAprovado['disciplinas'][number]): DisciplinaDoCurso {
  const itens: ItemDaLista[] = []
  const aulas: Aula[] = []
  const adicionar = (conteudo: ConteudoAprovado) => {
    const aula = { id: conteudo.id, nome: conteudo.nome, pagina: conteudo.pagina, numero: aulas.length + 1 }
    aulas.push(aula)
    itens.push({ tipo: 'aula', aula })
  }
  for (const assunto of disciplina.assuntos) {
    if (assunto.subassuntos.length) {
      itens.push({ tipo: 'grupo', nome: assunto.nome, chave: `grupo-${assunto.id}` })
      assunto.subassuntos.forEach(adicionar)
    } else {
      adicionar(assunto)
    }
  }
  return { id: disciplina.id, nome: disciplina.nome, itens, aulas }
}

const percentual = (feitas: number, total: number) => (total ? Math.round((feitas / total) * 100) : 0)

function AbasDoCurso({ cursoId }: { cursoId: number }) {
  const classe = ({ isActive }: { isActive: boolean }) =>
    cn('inline-flex h-full items-center rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors hover:text-foreground', isActive ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')
  return <nav className="flex h-10 w-full max-w-full items-center gap-1 overflow-x-auto rounded-lg bg-muted p-1 sm:w-fit" aria-label="Navegação do curso">
    <NavLink to={`/curso/${cursoId}`} end className={classe}>Conteúdo</NavLink>
    <NavLink to={`/questoes?curso=${cursoId}`} className={classe}>Questões</NavLink>
    <NavLink to="/cronograma" className={classe}>Cronograma</NavLink>
    <NavLink to={`/dashboard?curso=${cursoId}`} className={classe}>Desempenho</NavLink>
  </nav>
}

export default function TelaCurso({ token, onEncerrarSessao }: Props) {
  const { editalId } = useParams()
  const carregar = useCallback(
    async (): Promise<DadosDoCurso> => {
      // Painel deste curso: 204 (null) quando o aluno nao esta inscrito nele.
      const [editais, painel] = await Promise.all([listarEditaisAprovados(token), buscarDashboard(token, Number(editalId))])
      return { editais, painel }
    },
    [token, editalId],
  )
  const { dados, definirDados, carregando, erro } = useRecurso(carregar, onEncerrarSessao, 'Não foi possível abrir este curso. Tente novamente.')
  const [aviso, setAviso] = useState<string | null>(null)
  const [salvando, setSalvando] = useState<number | null>(null)
  const [inscrevendo, setInscrevendo] = useState(false)
  // undefined = o aluno ainda nao abriu/fechou nenhuma materia nesta visita.
  const [materiaEscolhida, setMateriaAberta] = useState<number | null | undefined>(undefined)
  const [aulaAberta, setAulaAberta] = useState<{ aula: Aula; disciplinaId: number } | null>(null)
  const [telaCheia, setTelaCheia] = useState(false)
  const [urlDoPdf, setUrlDoPdf] = useState<string | null>(null)
  const [carregandoPdf, setCarregandoPdf] = useState(false)
  const pdfContainerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const [parametros] = useSearchParams()
  // ?aula= vem do botao "Estudar" do cronograma: a materia dessa aula abre expandida.
  const aulaPedida = Number(parametros.get('aula')) || null
  const aulaPedidaAberta = useRef<number | null>(null)

  const curso = dados?.editais.find(edital => edital.id === Number(editalId)) ?? null
  const painel = dados?.painel ?? null
  const inscrito = Boolean(curso && painel?.editalId === curso.id)
  const disciplinas = useMemo(() => curso?.disciplinas.map(montarDisciplina) ?? [], [curso])
  const concluidas = useMemo(() => {
    const ids = new Set<number>()
    if (inscrito) painel?.disciplinas.forEach(d => d.topicos.forEach(t => { if (t.concluido) ids.add(t.id) }))
    return ids
  }, [painel, inscrito])

  const todasAsAulas = disciplinas.flatMap(d => d.aulas.map(aula => ({ aula, disciplinaId: d.id })))
  const materiaAberta = materiaEscolhida === undefined
    ? (todasAsAulas.find(({ aula }) => aula.id === aulaPedida)?.disciplinaId ?? null)
    : materiaEscolhida
  const totalAulas = todasAsAulas.length
  const temPdf = Boolean(curso?.possuiPdfOriginal || curso?.materialPdfUrl)
  const progresso = percentual(todasAsAulas.filter(({ aula }) => concluidas.has(aula.id)).length, totalAulas)
  const proxima = todasAsAulas.find(({ aula }) => !concluidas.has(aula.id)) ?? todasAsAulas[0]

  useEffect(() => {
    const aoMudar = () => setTelaCheia(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', aoMudar)
    return () => document.removeEventListener('fullscreenchange', aoMudar)
  }, [])

  useEffect(() => () => {
    if (urlDoPdf?.startsWith('blob:')) URL.revokeObjectURL(urlDoPdf)
  }, [urlDoPdf])

  async function alternarTelaCheia() {
    try {
      if (!document.fullscreenElement) await pdfContainerRef.current?.requestFullscreen()
      else await document.exitFullscreen()
    } catch {
      setTelaCheia(Boolean(document.fullscreenElement))
    }
  }

  /** Marca/desmarca com atualizacao imediata e desfaz se o servidor recusar. */
  async function alternarConclusao(aula: Aula) {
    if (!painel || salvando !== null) return
    const concluido = !concluidas.has(aula.id)
    const aplicar = (valor: boolean) => (atual: DadosDoCurso | null): DadosDoCurso | null => {
      if (!atual?.painel) return atual
      const disciplinasDoPainel = atual.painel.disciplinas.map(d => ({ ...d, topicos: d.topicos.map(t => (t.id === aula.id ? { ...t, concluido: valor } : t)) }))
      const topicosConcluidos = disciplinasDoPainel.flatMap(d => d.topicos).filter(t => t.concluido).length
      return { ...atual, painel: { ...atual.painel, disciplinas: disciplinasDoPainel, topicosConcluidos } }
    }
    setAviso(null)
    setSalvando(aula.id)
    definirDados(aplicar(concluido)(dados))
    try {
      await salvarRegistro(token, aula.id, { concluido })
    } catch (falha: unknown) {
      definirDados(aplicar(!concluido)(dados))
      const mensagem = mensagemDaFalha(falha, onEncerrarSessao, 'Não foi possível salvar o seu progresso. Tente novamente.')
      if (mensagem) setAviso(mensagem)
    } finally {
      setSalvando(null)
    }
  }

  async function inscreverNoCurso() {
    if (!curso) return
    setAviso(null)
    setInscrevendo(true)
    try {
      await inscrever(token, curso.id)
      navigate(`/planner?curso=${curso.id}`)
    } catch (falha: unknown) {
      const mensagem = mensagemDaFalha(falha, onEncerrarSessao, 'Não foi possível concluir a inscrição. Tente novamente.')
      if (mensagem) setAviso(mensagem)
    } finally {
      setInscrevendo(false)
    }
  }

  // Com PDF disponivel, a aula pedida ja abre no leitor (uma vez por aula pedida).
  useEffect(() => {
    if (!aulaPedida || !temPdf || aulaPedidaAberta.current === aulaPedida) return
    const alvo = todasAsAulas.find(({ aula }) => aula.id === aulaPedida)
    if (!alvo) return
    aulaPedidaAberta.current = aulaPedida
    void abrirAula(alvo.aula, alvo.disciplinaId)
  })

  async function abrirAula(aula: Aula, disciplinaId: number) {
    setAulaAberta({ aula, disciplinaId })
    setMateriaAberta(disciplinaId)
    if (!curso || urlDoPdf || carregandoPdf) return
    if (curso.materialPdfUrl) {
      setUrlDoPdf(curso.materialPdfUrl)
      return
    }
    setCarregandoPdf(true)
    setAviso(null)
    try {
      const pdf = await baixarPdfDoEdital(token, curso.id)
      setUrlDoPdf(URL.createObjectURL(pdf))
    } catch (falha: unknown) {
      setAulaAberta(null)
      const mensagem = mensagemDaFalha(falha, onEncerrarSessao, 'Não foi possível abrir o PDF original do edital.')
      if (mensagem) setAviso(mensagem)
    } finally {
      setCarregandoPdf(false)
    }
  }

  function continuar() {
    if (!proxima) return
    if (temPdf) {
      void abrirAula(proxima.aula, proxima.disciplinaId)
      return
    }
    const linha = document.getElementById(`aula-${proxima.aula.id}`)
    linha?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    linha?.querySelector<HTMLElement>('input, button')?.focus({ preventScroll: true })
  }

  if (carregando) return <Conteudo><EstadoCarregando formato="pagina">Carregando conteúdo do curso...</EstadoCarregando></Conteudo>
  if (erro) return <Conteudo><Aviso tipo="erro">{erro}</Aviso><Button asChild className="self-start"><Link to="/app">Voltar para Meus cursos</Link></Button></Conteudo>
  if (!curso) {
    return <EstadoDePagina titulo="Curso não encontrado" icone={<SearchXIcon />} acoes={<Button asChild><Link to="/app">Ver meus cursos</Link></Button>}>Este curso não existe ou não está mais disponível.</EstadoDePagina>
  }

  const textoContinuar = progresso === 100 ? 'Revisar do início' : progresso > 0 ? 'Continuar de onde parei' : 'Começar pela primeira aula'

  function listaDeAulas(disciplina: DisciplinaDoCurso) {
    if (!disciplina.aulas.length) return <p className="px-3 py-2 text-sm text-muted-foreground">O conteúdo desta disciplina ainda não foi detalhado no edital.</p>
    return <ol className="flex flex-col gap-0.5">
      {disciplina.itens.map(item => item.tipo === 'grupo'
        ? <li key={item.chave} className="px-3 pt-3 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{item.nome}</li>
        : <AulaRow
          key={item.aula.id}
          id={`aula-${item.aula.id}`}
          numero={item.aula.numero}
          titulo={item.aula.nome}
          concluida={concluidas.has(item.aula.id)}
          salvando={salvando === item.aula.id}
          atual={aulaAberta?.aula.id === item.aula.id}
          onAlternarConclusao={inscrito ? () => alternarConclusao(item.aula) : undefined}
          onAbrirPdf={temPdf ? () => void abrirAula(item.aula, disciplina.id) : undefined}
          recursos={temPdf
            ? <Button type="button" variant="ghost" size="icon-sm" title="Abrir PDF" aria-label={`Abrir PDF: ${item.aula.nome}`} onClick={() => void abrirAula(item.aula, disciplina.id)}><Icone nome="arquivo" /></Button>
            : undefined}
        />)}
    </ol>
  }

  function cabecalhoDaDisciplina(disciplina: DisciplinaDoCurso, colapsavel: boolean) {
    const feitas = disciplina.aulas.filter(aula => concluidas.has(aula.id)).length
    const aberta = materiaAberta === disciplina.id
    const pct = percentual(feitas, disciplina.aulas.length)
    return <header className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {colapsavel
        ? <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left font-semibold" aria-expanded={aberta} onClick={() => setMateriaAberta(aberta ? null : disciplina.id)}><Icone nome="chevron" className={cn('shrink-0 text-muted-foreground transition-transform', aberta && 'rotate-180')} />{disciplina.nome}</button>
        : <h2 className="min-w-0 flex-1 text-base font-semibold">{disciplina.nome}</h2>}
      <div className="flex flex-wrap items-center gap-2">
        {inscrito && <Badge variant={pct === 100 ? 'success' : 'secondary'}>{pct}% concluído</Badge>}
        <Button asChild variant="ghost" size="sm"><Link to={`/questoes?curso=${curso?.id ?? ''}&disciplina=${disciplina.id}`}><Icone nome="caderno" />Questões da disciplina</Link></Button>
      </div>
    </header>
  }

  const resumo = <Card className="gap-0 py-0"><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      {inscrito
        ? <><span className="flex items-center justify-between text-sm font-medium"><span>Seu progresso</span><span className="tabular-nums">{progresso}% concluído</span></span><Progress value={progresso} aria-label={`Progresso no curso: ${progresso}%`} /></>
        : <span className="text-sm text-muted-foreground">Inscreva-se para registrar seu progresso neste curso.</span>}
    </div>
    {proxima && <Button type="button" onClick={continuar} className="w-full sm:w-auto"><Icone nome="play" />{textoContinuar}</Button>}
  </CardContent></Card>

  const avisoDeInscricao = !inscrito && <div className="flex flex-col gap-3 rounded-xl border border-info/25 bg-info-soft p-4 sm:flex-row sm:items-center" role="status">
    <p className="flex-1 text-sm text-info">Adicione este curso ao seu planner para definir prioridades, marcar aulas e acompanhar seu desempenho.</p>
    <Button type="button" onClick={inscreverNoCurso} disabled={inscrevendo}>{inscrevendo ? 'Adicionando...' : 'Adicionar ao planner'}</Button>
  </div>

  const cabecalhoDoCurso = (id: string, titulo: string, contexto: string) => <div className="flex flex-col gap-1.5">
    <span className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">{contexto}</span>
    <h1 id={id} className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">{titulo}</h1>
  </div>

  if (!aulaAberta || !temPdf || !urlDoPdf) {
    return <Conteudo>
      <AbasDoCurso cursoId={curso.id} />
      <section className="flex flex-col gap-5" aria-labelledby="curso-titulo">
        {cabecalhoDoCurso('curso-titulo', curso.titulo, `${curso.orgao} · ${curso.ano}`)}
        {resumo}
        {avisoDeInscricao}
        {carregandoPdf && <EstadoCarregando formato="linha">Abrindo o PDF original do edital...</EstadoCarregando>}
        {aviso && <Notificacao tipo="erro" mensagem={aviso} onFechar={() => setAviso(null)} />}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {disciplinas.map(disciplina => <Card key={disciplina.id} role="article" className="gap-3 py-5">
            <CardContent className="flex flex-col gap-3 px-5">
              {cabecalhoDaDisciplina(disciplina, false)}
              <div className="-mx-2">{listaDeAulas(disciplina)}</div>
            </CardContent>
          </Card>)}
        </div>
      </section>
    </Conteudo>
  }

  const { aula } = aulaAberta
  return <Conteudo largura="larga">
    <AbasDoCurso cursoId={curso.id} />
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="flex min-w-0 flex-col gap-5" aria-labelledby="curso-aula-titulo">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          {cabecalhoDoCurso('curso-aula-titulo', aula.nome, curso.titulo)}
          <Button type="button" variant="outline" onClick={() => setAulaAberta(null)}><ArrowLeftIcon aria-hidden="true" />Voltar à lista</Button>
        </header>
        {resumo}
        {avisoDeInscricao}
        {aviso && <Notificacao tipo="erro" mensagem={aviso} onFechar={() => setAviso(null)} />}
        <div className={cn('flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm', telaCheia && 'fixed inset-0 z-[70] rounded-none border-0')} ref={pdfContainerRef}>
          <header className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-xs font-medium text-muted-foreground">Material de estudo</span>
              <h2 className="truncate font-semibold">{aula.nome}</h2>
              <p className="text-xs text-muted-foreground">Página {aula.pagina}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {inscrito && <Button type="button" size="sm" variant={concluidas.has(aula.id) ? 'secondary' : 'default'} aria-pressed={concluidas.has(aula.id)} disabled={salvando !== null} onClick={() => alternarConclusao(aula)}>{concluidas.has(aula.id) ? <><CheckIcon aria-hidden="true" />Aula concluída</> : 'Marcar como concluída'}</Button>}
              <Button type="button" variant="outline" size="icon-sm" onClick={alternarTelaCheia} title={telaCheia ? 'Sair da tela cheia' : 'Tela cheia'} aria-label={telaCheia ? 'Sair da tela cheia' : 'Tela cheia'}><Icone nome={telaCheia ? 'recolher' : 'expandir'} /></Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setAulaAberta(null)}>Fechar leitor</Button>
            </div>
          </header>
          <iframe
            key={`${aula.id}-${aula.pagina}`}
            className={cn('w-full flex-1 border-0 bg-muted', telaCheia ? 'h-full' : 'h-[70svh] min-h-[28rem]')}
            src={urlDaPagina(urlDoPdf, aula.pagina)}
            title={`PDF: ${aula.nome}, página ${aula.pagina}`}
          />
        </div>
      </section>
      <aside className="flex min-w-0 flex-col gap-3 xl:sticky xl:top-20 xl:max-h-[calc(100svh-6rem)] xl:overflow-y-auto" aria-label="Disciplinas do curso">
        {disciplinas.map(disciplina => <Card key={disciplina.id} role="article" className="gap-2 py-4">
          <CardContent className="flex flex-col gap-2 px-4">
            {cabecalhoDaDisciplina(disciplina, true)}
            {materiaAberta === disciplina.id && <div className="-mx-2">{listaDeAulas(disciplina)}</div>}
          </CardContent>
        </Card>)}
      </aside>
    </div>
  </Conteudo>
}
