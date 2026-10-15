import { useEffect, useMemo, useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { listarEditaisAprovados, type ConteudoAprovado, type EditalAprovado } from './editais'
import { ErroDeRede, SessaoEncerrada } from './sessao'
import Aviso from './componentes/Aviso'
import EstadoCarregando from './componentes/EstadoCarregando'
import AulaRow from './componentes/AulaRow'

type Props = { token: string; onEncerrarSessao: (motivo?: string) => void }
type TipoDeMidia = 'VIDEO' | 'PDF'
type PdfSelecionado = { titulo: string; pagina: number; url: string }

function urlDaPagina(pdfUrl: string, pagina: number) {
  return `${pdfUrl.split('#')[0]}#page=${Math.max(1, pagina)}`
}

function Icone({ nome }: { nome: 'play' | 'chevron' | 'arquivo' | 'tela' | 'audio' | 'nota' | 'caderno' }) {
  if (nome === 'play') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 9 6-9 6z" /></svg>
  if (nome === 'chevron') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4" /></svg>
  if (nome === 'arquivo') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6zM14 3v5h5M9 13h6m-6 4h6" /></svg>
  if (nome === 'tela') return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8m-4-4v4" /></svg>
  if (nome === 'audio') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10v4h3l4 3V7l-4 3zm10.5-1.5a5 5 0 0 1 0 7m2.5-10a9 9 0 0 1 0 13" /></svg>
  if (nome === 'nota') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h14v18H5zM8 8h8m-8 4h8m-8 4h5" /></svg>
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
  const [midia, setMidia] = useState<TipoDeMidia>('VIDEO')
  const [disciplinasAbertas, setDisciplinasAbertas] = useState(true)
  const [materiaAberta, setMateriaAberta] = useState<number | null>(null)
  const [aulasConcluidas, setAulasConcluidas] = useState<Record<number, boolean>>({})
  const [pdfSelecionado, setPdfSelecionado] = useState<PdfSelecionado | null>(null)
  const navigate = useNavigate()

  const abrirPdf = (titulo: string, pagina: number) => {
    if (!curso?.materialPdfUrl) return
    setPdfSelecionado({ titulo, pagina, url: curso.materialPdfUrl })
    setMidia('PDF')
  }

  useEffect(() => {
    let cancelado = false
    listarEditaisAprovados(token)
      .then(editais => {
        if (cancelado) return
        const encontrado = editais.find(edital => edital.id === Number(editalId)) ?? editais[0] ?? null
        setCurso(encontrado)
        setMateriaAberta(encontrado?.disciplinas[0]?.id ?? null)
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

      <section className="curso-conteudo">
        <header className="curso-conteudo__cabecalho"><div><span className="sobretitulo">{curso.orgao}</span><h1>Conteúdo</h1></div><button type="button" className="curso-link" onClick={() => setDisciplinasAbertas(true)}>Exibir tudo</button></header>
        <div className="curso-subabas" role="tablist" aria-label="Formato do conteúdo">
          <button type="button" role="tab" aria-selected={midia === 'VIDEO'} className={midia === 'VIDEO' ? 'curso-subaba--ativa' : ''} onClick={() => setMidia('VIDEO')}>Vídeo</button>
          {curso.materialPdfUrl && <button type="button" role="tab" aria-selected={midia === 'PDF'} className={midia === 'PDF' ? 'curso-subaba--ativa' : ''} onClick={() => setMidia('PDF')}>PDF</button>}
        </div>
        <div className="curso-progresso-geral"><div><span>{progresso}% concluído</span><progress value={progresso} max="100" aria-label={`${progresso}% concluído`} /></div><button type="button" className="curso-iniciar" onClick={() => navigate('/cronograma')}><Icone nome="play" />Iniciar curso</button></div>

        {midia === 'PDF' && <section className="curso-pdf" aria-label="Leitor de PDF">
          {pdfSelecionado ? <>
            <header className="curso-pdf__cabecalho">
              <div><span>Material de estudo</span><h2>{pdfSelecionado.titulo}</h2><p>Página {pdfSelecionado.pagina}</p></div>
              <button type="button" onClick={() => setPdfSelecionado(null)}>Fechar leitor</button>
            </header>
            <iframe
              key={`${pdfSelecionado.titulo}-${pdfSelecionado.pagina}`}
              className="curso-pdf__leitor"
              src={urlDaPagina(pdfSelecionado.url, pdfSelecionado.pagina)}
              title={`PDF: ${pdfSelecionado.titulo}, página ${pdfSelecionado.pagina}`}
            />
          </> : <p className="curso-pdf__vazio">Selecione o título de uma aula ou o ícone de PDF para abrir o material na página correspondente.</p>}
        </section>}
        <section className="curso-disciplinas">
          <button type="button" className="curso-disciplinas__gatilho" aria-expanded={disciplinasAbertas} onClick={() => setDisciplinasAbertas(aberta => !aberta)}>Disciplinas <Icone nome="chevron" /></button>
          {disciplinasAbertas && <div className="curso-disciplinas__lista">
            {curso.disciplinas.map(disciplina => {
              const aberta = materiaAberta === disciplina.id
              const aulas = aulasDaDisciplina(disciplina.assuntos)
              const topico = disciplina.assuntos[0]
              const aulasFeitas = aulas.filter(aula => aulasConcluidas[aula.id]).length
              const percentual = aulas.length ? Math.round((aulasFeitas / aulas.length) * 100) : 0
              return <article className="curso-disciplina" key={disciplina.id}>
                <header className="curso-disciplina__cabecalho">
                  <button type="button" className="curso-disciplina__titulo" aria-expanded={aberta} onClick={() => setMateriaAberta(valor => valor === disciplina.id ? null : disciplina.id)}><span className={aberta ? 'curso-disciplina__seta curso-disciplina__seta--aberta' : 'curso-disciplina__seta'}><Icone nome="chevron" /></span>{disciplina.nome}</button>
                  <span className="curso-disciplina__percentual">{percentual}% concluído</span>
                  <button type="button" className="curso-caderno" onClick={() => navigate('/questoes')}><Icone nome="caderno" />Caderno de questões</button>
                </header>
                {aberta && <div className="curso-disciplina__conteudo">
                  <div className="curso-topico"><strong>Tópico 1</strong><p>{topico ? topico.nome : 'Conteúdos selecionados para a sua preparação neste edital.'}</p></div>
                  <ol className="curso-aulas">
                    {aulas.map((aula, indice) => <AulaRow
                      key={`${disciplina.id}-${aula.id}`}
                      numero={indice + 1}
                      titulo={aula.nome}
                      concluida={Boolean(aulasConcluidas[aula.id])}
                      duracao="00:32:02"
                      onAlternarConclusao={() => setAulasConcluidas(atual => ({ ...atual, [aula.id]: !atual[aula.id] }))}
                      onAbrirPdf={curso.materialPdfUrl ? () => abrirPdf(aula.nome, aula.pagina) : undefined}
                      recursos={<>{curso.materialPdfUrl && <button type="button" title="Abrir PDF" aria-label={`Abrir PDF: ${aula.nome}`} onClick={() => abrirPdf(aula.nome, aula.pagina)}><Icone nome="arquivo" /></button>}<button type="button" title="Tela de aula" aria-label="Tela de aula"><Icone nome="tela" /></button><button type="button" title="Áudio" aria-label="Áudio"><Icone nome="audio" /></button><button type="button" title="Anotações" aria-label="Anotações"><Icone nome="nota" /></button></>}
                    />)}
                  </ol>
                </div>}
              </article>
            })}
          </div>}
        </section>
      </section>
    </>}
  </main>
}
