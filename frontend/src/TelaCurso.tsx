import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom'
import { mensagemDaFalha } from './api'
import { inscrever } from './cursos'
import { buscarDashboard, salvarRegistro, type Dashboard } from './dashboard'
import { baixarPdfDoEdital, listarEditaisAprovados, type ConteudoAprovado, type EditalAprovado } from './editais'
import { useRecurso } from './useRecurso'
import Aviso from './componentes/Aviso'
import EstadoCarregando from './componentes/EstadoCarregando'
import AulaRow from './componentes/AulaRow'

type Props = { token: string; onEncerrarSessao: (motivo?: string) => void }

/** Aula = topico final do edital (sem subassuntos), o mesmo que o backend registra. */
type Aula = { id: number; nome: string; pagina: number; numero: number }
type ItemDaLista = { tipo: 'grupo'; nome: string; chave: string } | { tipo: 'aula'; aula: Aula }
type DisciplinaDoCurso = { id: number; nome: string; itens: ItemDaLista[]; aulas: Aula[] }
type DadosDoCurso = { editais: EditalAprovado[]; painel: Dashboard | null }

function urlDaPagina(pdfUrl: string, pagina: number) {
  return `${pdfUrl.split('#')[0]}#page=${Math.max(1, pagina)}`
}

function Icone({ nome }: { nome: 'play' | 'chevron' | 'arquivo' | 'caderno' | 'expandir' | 'recolher' }) {
  if (nome === 'play') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 9 6-9 6z" /></svg>
  if (nome === 'chevron') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4" /></svg>
  if (nome === 'arquivo') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6zM14 3v5h5M9 13h6m-6 4h6" /></svg>
  if (nome === 'expandir') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>
  if (nome === 'recolher') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" /></svg>
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5zM8 8h8M8 12h5m-5 4h8" /></svg>
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
  const classe = ({ isActive }: { isActive: boolean }) => (isActive ? 'curso-aba--ativa' : undefined)
  return <nav className="curso-abas-principais" aria-label="Navegação do curso">
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
  const [materiaAberta, setMateriaAberta] = useState<number | null>(null)
  const [aulaAberta, setAulaAberta] = useState<{ aula: Aula; disciplinaId: number } | null>(null)
  const [telaCheia, setTelaCheia] = useState(false)
  const [urlDoPdf, setUrlDoPdf] = useState<string | null>(null)
  const [carregandoPdf, setCarregandoPdf] = useState(false)
  const pdfContainerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

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

  if (carregando) return <main className="tela tela-curso"><EstadoCarregando>Carregando conteúdo do curso...</EstadoCarregando></main>
  if (erro) return <main className="tela tela-curso"><Aviso tipo="erro">{erro}</Aviso><Link className="botao-link" to="/app">Voltar para Meus cursos</Link></main>
  if (!curso) {
    return <main className="tela tela-curso"><section className="estado-pagina"><h1>Curso não encontrado</h1><p>Este curso não existe ou não está mais disponível.</p><div className="estado-pagina__acoes"><Link className="botao-link" to="/app">Ver meus cursos</Link></div></section></main>
  }

  const textoContinuar = progresso === 100 ? 'Revisar do início' : progresso > 0 ? 'Continuar de onde parei' : 'Começar pela primeira aula'

  function listaDeAulas(disciplina: DisciplinaDoCurso) {
    if (!disciplina.aulas.length) return <p className="curso-aulas__vazio">O conteúdo desta disciplina ainda não foi detalhado no edital.</p>
    return <ol className="curso-aulas">
      {disciplina.itens.map(item => item.tipo === 'grupo'
        ? <li key={item.chave} className="curso-aulas__grupo">{item.nome}</li>
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
            ? <button type="button" title="Abrir PDF" aria-label={`Abrir PDF: ${item.aula.nome}`} onClick={() => void abrirAula(item.aula, disciplina.id)}><Icone nome="arquivo" /></button>
            : undefined}
        />)}
    </ol>
  }

  function cabecalhoDaDisciplina(disciplina: DisciplinaDoCurso, colapsavel: boolean) {
    const feitas = disciplina.aulas.filter(aula => concluidas.has(aula.id)).length
    const aberta = materiaAberta === disciplina.id
    return <header className="curso-disciplina__cabecalho">
      {colapsavel
        ? <button type="button" className="curso-disciplina__titulo" aria-expanded={aberta} onClick={() => setMateriaAberta(valor => (valor === disciplina.id ? null : disciplina.id))}><span className={aberta ? 'curso-disciplina__seta curso-disciplina__seta--aberta' : 'curso-disciplina__seta'}><Icone nome="chevron" /></span>{disciplina.nome}</button>
        : <h2 className="curso-disciplina__titulo">{disciplina.nome}</h2>}
      {inscrito && <span className="curso-disciplina__percentual">{percentual(feitas, disciplina.aulas.length)}% concluído</span>}
      <Link className="curso-caderno" to={`/questoes?curso=${curso?.id ?? ''}&disciplina=${disciplina.id}`}><Icone nome="caderno" />Questões da disciplina</Link>
    </header>
  }

  const resumo = <div className="curso-progresso-geral">
    <div>
      {inscrito
        ? <><span>{progresso}% concluído</span><progress value={progresso} max="100" aria-label={`Progresso no curso: ${progresso}%`} /></>
        : <span>Inscreva-se para registrar seu progresso neste curso.</span>}
    </div>
    {proxima && <button type="button" className="curso-iniciar" onClick={continuar}><Icone nome="play" />{textoContinuar}</button>}
  </div>

  const avisoDeInscricao = !inscrito && <div className="curso-inscricao" role="status">
    <p>Adicione este curso ao seu planner para definir prioridades, marcar aulas e acompanhar seu desempenho.</p>
    <button type="button" className="botao-link" onClick={inscreverNoCurso} disabled={inscrevendo}>{inscrevendo ? 'Adicionando...' : 'Adicionar ao planner'}</button>
  </div>

  if (!aulaAberta || !temPdf || !urlDoPdf) {
    return <main className="tela tela-curso">
      <AbasDoCurso cursoId={curso.id} />
      <section className="curso-lista" aria-labelledby="curso-titulo">
        <header className="curso-lista__cabecalho"><div><span className="sobretitulo">{curso.orgao} · {curso.ano}</span><h1 id="curso-titulo">{curso.titulo}</h1></div></header>
        {resumo}
        {avisoDeInscricao}
        {carregandoPdf && <EstadoCarregando>Abrindo o PDF original do edital...</EstadoCarregando>}
        {aviso && <Aviso tipo="erro">{aviso}</Aviso>}
        <div className="curso-lista__disciplinas">
          {disciplinas.map(disciplina => <article className="curso-disciplina" key={disciplina.id}>
            {cabecalhoDaDisciplina(disciplina, false)}
            <div className="curso-disciplina__conteudo">{listaDeAulas(disciplina)}</div>
          </article>)}
        </div>
      </section>
    </main>
  }

  const { aula } = aulaAberta
  return <main className="tela tela-curso">
    <AbasDoCurso cursoId={curso.id} />
    <div className="curso-layout">
      <section className="curso-pdf-area" aria-labelledby="curso-aula-titulo">
        <header className="curso-pdf-area__cabecalho"><div><span className="sobretitulo">{curso.titulo}</span><h1 id="curso-aula-titulo">{aula.nome}</h1></div><button type="button" className="curso-link" onClick={() => setAulaAberta(null)}>Voltar à lista</button></header>
        {resumo}
        {avisoDeInscricao}
        {aviso && <Aviso tipo="erro">{aviso}</Aviso>}
        <div className={`curso-pdf${telaCheia ? ' curso-pdf--tela-cheia' : ''}`} ref={pdfContainerRef}>
          <header className="curso-pdf__cabecalho">
            <div><span>Material de estudo</span><h2>{aula.nome}</h2><p>Página {aula.pagina}</p></div>
            <div className="curso-pdf__acoes">
              {inscrito && <button type="button" aria-pressed={concluidas.has(aula.id)} disabled={salvando !== null} onClick={() => alternarConclusao(aula)}>{concluidas.has(aula.id) ? 'Aula concluída' : 'Marcar como concluída'}</button>}
              <button type="button" onClick={alternarTelaCheia} title={telaCheia ? 'Sair da tela cheia' : 'Tela cheia'} aria-label={telaCheia ? 'Sair da tela cheia' : 'Tela cheia'}><Icone nome={telaCheia ? 'recolher' : 'expandir'} /></button>
              <button type="button" onClick={() => setAulaAberta(null)}>Fechar leitor</button>
            </div>
          </header>
          <iframe
            key={`${aula.id}-${aula.pagina}`}
            className="curso-pdf__leitor"
            src={urlDaPagina(urlDoPdf, aula.pagina)}
            title={`PDF: ${aula.nome}, página ${aula.pagina}`}
          />
        </div>
      </section>
      <aside className="curso-disciplinas" aria-label="Disciplinas do curso">
        <div className="curso-disciplinas__lista">
          {disciplinas.map(disciplina => <article className="curso-disciplina" key={disciplina.id}>
            {cabecalhoDaDisciplina(disciplina, true)}
            {materiaAberta === disciplina.id && <div className="curso-disciplina__conteudo">{listaDeAulas(disciplina)}</div>}
          </article>)}
        </div>
      </aside>
    </div>
  </main>
}
