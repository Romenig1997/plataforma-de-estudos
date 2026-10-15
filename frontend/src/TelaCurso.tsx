import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { listarEditaisAprovados, type ConteudoAprovado, type EditalAprovado } from './editais'
import { ErroDeRede, SessaoEncerrada } from './sessao'
import Aviso from './componentes/Aviso'
import EstadoCarregando from './componentes/EstadoCarregando'
import AulaRow from './componentes/AulaRow'

type Props = { token: string; onEncerrarSessao: (motivo?: string) => void }
type PdfSelecionado = { titulo: string; pagina: number; url: string }

function urlDaPagina(pdfUrl: string, pagina: number) {
  return `${pdfUrl.split('#')[0]}#page=${Math.max(1, pagina)}`
}

function Icone({ nome }: { nome: 'play' | 'chevron' | 'arquivo' | 'tela' | 'audio' | 'nota' | 'caderno' | 'expandir' | 'recolher' }) {
  if (nome === 'play') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 9 6-9 6z" /></svg>
  if (nome === 'chevron') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4" /></svg>
  if (nome === 'arquivo') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6zM14 3v5h5M9 13h6m-6 4h6" /></svg>
  if (nome === 'tela') return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8m-4-4v4" /></svg>
  if (nome === 'audio') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10v4h3l4 3V7l-4 3zm10.5-1.5a5 5 0 0 1 0 7m2.5-10a9 9 0 0 1 0 13" /></svg>
  if (nome === 'nota') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h14v18H5zM8 8h8m-8 4h8m-8 4h5" /></svg>
  if (nome === 'expandir') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>
  if (nome === 'recolher') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" /></svg>
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5zM8 8h8M8 12h5m-5 4h8" /></svg>
}

function aulasDaDisciplina(assuntos: ConteudoAprovado[]) {
  const aulas = assuntos.flatMap(assunto => [assunto, ...assunto.subassuntos])
  return aulas.length ? aulas : [{ id: 0, nome: 'Introdução à disciplina', pagina: 1, subassuntos: [] }]
}

export default function TelaCurso({ token, onEncerrarSessao }: Props) {
  const { editalId } = useParams()
  const [curso, setCurso] = useState<EditalAprovado | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [materiaAberta, setMateriaAberta] = useState<number | null>(null)
  const [aulasConcluidas, setAulasConcluidas] = useState<Record<number, boolean>>({})
  const [pdfSelecionado, setPdfSelecionado] = useState<PdfSelecionado | null>(null)
  const [telaCheia, setTelaCheia] = useState(false)
  const pdfContainerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const alternarTelaCheia = async () => {
    try {
      if (!document.fullscreenElement) {
        await pdfContainerRef.current?.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch {
      setTelaCheia(Boolean(document.fullscreenElement))
    }
  }

  useEffect(() => {
    const aoMudar = () => setTelaCheia(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', aoMudar)
    return () => document.removeEventListener('fullscreenchange', aoMudar)
  }, [])

  const abrirPdf = (titulo: string, pagina: number) => {
    if (!curso?.materialPdfUrl) return
    setPdfSelecionado({ titulo, pagina, url: curso.materialPdfUrl })
  }

  useEffect(() => {
    let cancelado = false
    listarEditaisAprovados(token)
      .then(editais => {
        if (cancelado) return
        const encontrado = editais.find(edital => edital.id === Number(editalId)) ?? editais[0] ?? null
        setCurso(encontrado)
      })
      .catch((falha: unknown) => {
        if (cancelado) return
        if (falha instanceof SessaoEncerrada) onEncerrarSessao('Sua sessão expirou. Faça login novamente.')
        else setErro(falha instanceof ErroDeRede ? 'Não foi possível carregar o curso.' : 'Não foi possível abrir este curso.')
      })
      .finally(() => { if (!cancelado) setCarregando(false) })
    return () => { cancelado = true }
  }, [editalId, token, onEncerrarSessao])

  const totalAulas = useMemo(() => curso?.disciplinas.reduce((total, disciplina) => total + aulasDaDisciplina(disciplina.assuntos).length, 0) ?? 0, [curso])
  const concluidas = Object.values(aulasConcluidas).filter(Boolean).length
  const progresso = totalAulas ? Math.round((concluidas / totalAulas) * 100) : 0

  if (!pdfSelecionado) {
    return <main className="tela tela-curso">
      {carregando && <EstadoCarregando>Carregando conteúdo do curso...</EstadoCarregando>}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {!carregando && !erro && !curso && <Aviso tipo="erro">Nenhum curso disponível para abrir.</Aviso>}
      {curso && <>
        <nav className="curso-abas-principais" aria-label="Navegação do curso">
          <NavLink to="/dashboard">Painel</NavLink>
          <NavLink to={`/curso/${curso.id}`} className="curso-aba--ativa">Conteúdo</NavLink>
          <NavLink to="/cronograma">Cronograma</NavLink>
          <NavLink to="/analise">Fórum de dúvidas</NavLink>
        </nav>
        <section className="curso-lista">
          <header className="curso-lista__cabecalho"><div><span className="sobretitulo">{curso.orgao}</span><h1>Conteúdo</h1></div><div className="curso-progresso-geral"><div><span>{progresso}% concluído</span><progress value={progresso} max="100" aria-label={`${progresso}% concluído`} /></div><button type="button" className="curso-iniciar" onClick={() => navigate('/cronograma')}><Icone nome="play" />Iniciar curso</button></div></header>
          <div className="curso-lista__disciplinas">
            {curso.disciplinas.map(disciplina => {
              const aulas = aulasDaDisciplina(disciplina.assuntos)
              const aulasFeitas = aulas.filter(aula => aulasConcluidas[aula.id]).length
              const percentual = aulas.length ? Math.round((aulasFeitas / aulas.length) * 100) : 0
              return <article className="curso-disciplina" key={disciplina.id}>
                <header className="curso-disciplina__cabecalho">
                  <span className="curso-disciplina__titulo">{disciplina.nome}</span>
                  <span className="curso-disciplina__percentual">{percentual}% concluído</span>
                  <button type="button" className="curso-caderno" onClick={() => navigate('/questoes')}><Icone nome="caderno" />Caderno de questões</button>
                </header>
                <div className="curso-disciplina__conteudo">
                  <ol className="curso-aulas">
                    {aulas.map((aula, indice) => <AulaRow
                      key={`${disciplina.id}-${aula.id}`}
                      numero={indice + 1}
                      titulo={aula.nome}
                      concluida={Boolean(aulasConcluidas[aula.id])}
                      onAlternarConclusao={() => setAulasConcluidas(atual => ({ ...atual, [aula.id]: !aulasConcluidas[aula.id] }))}
                      onAbrirPdf={curso.materialPdfUrl ? () => abrirPdf(aula.nome, aula.pagina) : undefined}
                      recursos={<>{curso.materialPdfUrl && <button type="button" title="Abrir PDF" aria-label={`Abrir PDF: ${aula.nome}`} onClick={() => abrirPdf(aula.nome, aula.pagina)}><Icone nome="arquivo" /></button>}<button type="button" title="Tela de aula" aria-label="Tela de aula"><Icone nome="tela" /></button><button type="button" title="Áudio" aria-label="Áudio"><Icone nome="audio" /></button><button type="button" title="Anotações" aria-label="Anotações"><Icone nome="nota" /></button></>}
                    />)}
                  </ol>
                </div>
              </article>
            })}
          </div>
        </section>
      </>}
    </main>
  }

  return <main className="tela tela-curso">
    {carregando && <EstadoCarregando>Carregando conteúdo do curso...</EstadoCarregando>}
    {erro && <Aviso tipo="erro">{erro}</Aviso>}
    {!carregando && !erro && !curso && <Aviso tipo="erro">Nenhum curso disponível para abrir.</Aviso>}
    {curso && <>
      <nav className="curso-abas-principais" aria-label="Navegação do curso">
        <NavLink to="/dashboard">Painel</NavLink>
        <NavLink to={`/curso/${curso.id}`} className="curso-aba--ativa">Conteúdo</NavLink>
        <NavLink to="/cronograma">Cronograma</NavLink>
        <NavLink to="/analise">Fórum de dúvidas</NavLink>
      </nav>

      <div className="curso-layout">
        <section className="curso-pdf-area">
          <header className="curso-pdf-area__cabecalho"><div><span className="sobretitulo">{curso.orgao}</span><h1>{pdfSelecionado.titulo}</h1></div><button type="button" className="curso-link" onClick={() => setPdfSelecionado(null)}>Voltar à lista</button></header>
          <div className="curso-progresso-geral"><div><span>{progresso}% concluído</span><progress value={progresso} max="100" aria-label={`${progresso}% concluído`} /></div><button type="button" className="curso-iniciar" onClick={() => navigate('/cronograma')}><Icone nome="play" />Iniciar curso</button></div>
          <div className={`curso-pdf${telaCheia ? ' curso-pdf--tela-cheia' : ''}`} ref={pdfContainerRef}>
            <header className="curso-pdf__cabecalho">
              <div><span>Material de estudo</span><h2>{pdfSelecionado.titulo}</h2><p>Página {pdfSelecionado.pagina}</p></div>
              <div className="curso-pdf__acoes">
                <button type="button" onClick={alternarTelaCheia} title={telaCheia ? 'Sair da tela cheia' : 'Tela cheia'} aria-label={telaCheia ? 'Sair da tela cheia' : 'Tela cheia'}><Icone nome={telaCheia ? 'recolher' : 'expandir'} /></button>
                <button type="button" onClick={() => setPdfSelecionado(null)}>Fechar leitor</button>
              </div>
            </header>
            <iframe
              key={`${pdfSelecionado.titulo}-${pdfSelecionado.pagina}`}
              className="curso-pdf__leitor"
              src={urlDaPagina(pdfSelecionado.url, pdfSelecionado.pagina)}
              title={`PDF: ${pdfSelecionado.titulo}, página ${pdfSelecionado.pagina}`}
            />
          </div>
        </section>
        <aside className="curso-disciplinas">
          <div className="curso-disciplinas__lista">
            {curso.disciplinas.map(disciplina => {
              const aberta = materiaAberta === disciplina.id
              const aulas = aulasDaDisciplina(disciplina.assuntos)
              const aulasFeitas = aulas.filter(aula => aulasConcluidas[aula.id]).length
              const percentual = aulas.length ? Math.round((aulasFeitas / aulas.length) * 100) : 0
              return <article className="curso-disciplina" key={disciplina.id}>
                <header className="curso-disciplina__cabecalho">
                  <button type="button" className="curso-disciplina__titulo" aria-expanded={aberta} onClick={() => setMateriaAberta(valor => valor === disciplina.id ? null : disciplina.id)}><span className={aberta ? 'curso-disciplina__seta curso-disciplina__seta--aberta' : 'curso-disciplina__seta'}><Icone nome="chevron" /></span>{disciplina.nome}</button>
                  <span className="curso-disciplina__percentual">{percentual}% concluído</span>
                  <button type="button" className="curso-caderno" onClick={() => navigate('/questoes')}><Icone nome="caderno" />Caderno de questões</button>
                </header>
                {aberta && <div className="curso-disciplina__conteudo">
                  <ol className="curso-aulas">
                    {aulas.map((aula, indice) => <AulaRow
                      key={`${disciplina.id}-${aula.id}`}
                      numero={indice + 1}
                      titulo={aula.nome}
                      concluida={Boolean(aulasConcluidas[aula.id])}
                      onAlternarConclusao={() => setAulasConcluidas(atual => ({ ...atual, [aula.id]: !aulasConcluidas[aula.id] }))}
                      onAbrirPdf={curso.materialPdfUrl ? () => abrirPdf(aula.nome, aula.pagina) : undefined}
                      recursos={<>{curso.materialPdfUrl && <button type="button" title="Abrir PDF" aria-label={`Abrir PDF: ${aula.nome}`} onClick={() => abrirPdf(aula.nome, aula.pagina)}><Icone nome="arquivo" /></button>}<button type="button" title="Tela de aula" aria-label="Tela de aula"><Icone nome="tela" /></button><button type="button" title="Áudio" aria-label="Áudio"><Icone nome="audio" /></button><button type="button" title="Anotações" aria-label="Anotações"><Icone nome="nota" /></button></>}
                    />)}
                  </ol>
                </div>}
              </article>
            })}
          </div>
        </aside>
      </div>
    </>}
  </main>
}
