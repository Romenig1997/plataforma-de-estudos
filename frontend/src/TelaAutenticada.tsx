import { useCallback, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { mensagemDaFalha } from './api'
import { cancelarInscricao, definirFoco, inscrever, listarInscricoes, type Inscricao } from './cursos'
import { listarEditaisAprovados, type EditalAprovado } from './editais'
import { buscarSessaoAtual, type Usuario } from './sessao'
import { useRecurso } from './useRecurso'
import Aviso from './componentes/Aviso'
import Botao from './componentes/Botao'
import EstadoCarregando from './componentes/EstadoCarregando'

type Props = { token: string; onEncerrarSessao: (motivo?: string) => void }
type DadosDosCursos = { usuario: Usuario; editais: EditalAprovado[]; inscricoes: Inscricao[] }

const percentual = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`

function CapaDoCurso({ titulo, indice }: { titulo: string; indice: number }) {
  const temas = ['curso-card__capa--azul', 'curso-card__capa--violeta', 'curso-card__capa--petroleo']
  return <div className={`curso-card__capa ${temas[indice % temas.length]}`} role="img" aria-label={`Capa do curso ${titulo}`}>
    <svg viewBox="0 0 360 180" aria-hidden="true"><circle cx="294" cy="28" r="62" /><path d="M-8 157C84 90 157 204 246 126c42-37 76-42 122-15v69H-8z" /><path d="M225 53l14 14 31-35" /></svg>
    <span>CONCURSOS</span>
  </div>
}

/**
 * Meus cursos: os cursos em que o aluno esta inscrito (com progresso e o
 * curso em foco primeiro) e a vitrine dos demais editais para se inscrever.
 */
export default function TelaAutenticada({ token, onEncerrarSessao }: Props) {
  const carregar = useCallback(async (): Promise<DadosDosCursos> => {
    const [usuario, editais, inscricoes] = await Promise.all([buscarSessaoAtual(token), listarEditaisAprovados(token), listarInscricoes(token)])
    return { usuario, editais, inscricoes }
  }, [token])
  const { dados, carregando, erro, recarregar } = useRecurso(carregar, onEncerrarSessao, 'Não foi possível carregar os seus cursos. Tente novamente.')
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)
  const [ocupado, setOcupado] = useState<number | null>(null)
  const [confirmandoCancelamento, setConfirmandoCancelamento] = useState<number | null>(null)
  const navigate = useNavigate()
  const [parametros] = useSearchParams()
  const termo = parametros.get('buscar')?.trim() ?? ''
  const busca = termo.toLocaleLowerCase('pt-BR')

  const usuario = dados?.usuario ?? null
  const inscricoes = dados?.inscricoes ?? []
  const inscritos = new Set(inscricoes.map(i => i.editalId))
  const combina = (texto: string) => !busca || texto.toLocaleLowerCase('pt-BR').includes(busca)
  const meus = inscricoes
    .filter(i => combina(`${i.titulo} ${i.orgao} ${i.ano}`))
    .sort((a, b) => Number(b.emFoco) - Number(a.emFoco))
  const vitrine = (dados?.editais ?? []).filter(e => !inscritos.has(e.id) && combina(`${e.titulo} ${e.orgao} ${e.ano}`))

  /** Executa uma acao de inscricao e recarrega a lista, com feedback. */
  async function agir(editalId: number, acao: () => Promise<unknown>, sucesso: string, falhaPadrao: string, depois?: () => void) {
    setAviso(null)
    setOcupado(editalId)
    try {
      await acao()
      setAviso({ tipo: 'sucesso', texto: sucesso })
      setConfirmandoCancelamento(null)
      recarregar()
      depois?.()
    } catch (falha: unknown) {
      const mensagem = mensagemDaFalha(falha, onEncerrarSessao, falhaPadrao)
      if (mensagem) setAviso({ tipo: 'erro', texto: mensagem })
    } finally {
      setOcupado(null)
    }
  }

  return <main className="tela tela-cursos">
    <header className="cursos-cabecalho">
      <div><span className="sobretitulo">MINHA PREPARAÇÃO</span><h1>Meus cursos</h1><p>{usuario ? `Olá, ${usuario.nome.split(' ')[0]}. Escolha um curso para continuar seus estudos.` : 'Escolha um curso para continuar seus estudos.'}</p></div>
      <div className="cursos-cabecalho__acoes">
        {usuario?.perfil === 'ADMIN' && <Link className="cursos-cabecalho__acao cursos-cabecalho__acao--texto" to="/admin">Área administrativa</Link>}
        {vitrine.length > 0 && <a className="cursos-cabecalho__acao" href="#explorar-cursos">Explorar cursos <span aria-hidden="true">+</span></a>}
      </div>
    </header>
    {erro && <><Aviso tipo="erro">{erro}</Aviso><Botao type="button" variante="secundario" onClick={recarregar}>Tentar novamente</Botao></>}
    {carregando && !dados && <EstadoCarregando>Carregando seus cursos...</EstadoCarregando>}
    {aviso && <div className="cursos-aviso"><Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso></div>}
    {termo && dados && <p className="cursos-busca" role="status">Resultados para “{termo}”. <Link to="/app">Limpar pesquisa</Link></p>}

    {dados && <>
      <section className="cursos-secao" aria-labelledby="titulo-meus-cursos">
        <h2 id="titulo-meus-cursos" className="visualmente-oculto">Cursos em que você está inscrito</h2>
        {!inscricoes.length && <div className="cursos-vazio"><h2>Você ainda não está inscrito em nenhum curso</h2><p>Escolha um curso abaixo e inscreva-se para montar seu plano, marcar aulas e acompanhar seu desempenho.</p>{usuario?.perfil === 'ADMIN' && !dados.editais.length && <Link to="/admin/editais">Gerenciar editais</Link>}</div>}
        {inscricoes.length > 0 && !meus.length && <div className="cursos-vazio"><h2>Nenhum dos seus cursos corresponde à pesquisa</h2></div>}
        {meus.length > 0 && <div className="cursos-grade">
          {meus.map((inscricao, indice) => <article className={`curso-card${inscricao.emFoco ? ' curso-card--foco' : ''}`} key={inscricao.editalId}>
            <CapaDoCurso titulo={inscricao.titulo} indice={indice} />
            <div className="curso-card__corpo">
              <div className="curso-card__meta"><span>{inscricao.orgao}</span><span>{inscricao.ano}</span></div>
              <h2>{inscricao.titulo}</h2>
              <p>{inscricao.emFoco ? <span className="selo">Em foco</span> : `Meta de ${inscricao.metaHorasSemanais}h por semana`}</p>
              <div className="curso-card__progresso"><div><span>Progresso</span><strong>{percentual(inscricao.progresso)}</strong></div><progress value={inscricao.progresso} max="100" aria-label={`Progresso em ${inscricao.titulo}: ${percentual(inscricao.progresso)}`} /></div>
              <Link className="curso-card__acessar" to={`/curso/${inscricao.editalId}`} aria-label={`Continuar ${inscricao.titulo}`}>Continuar <span aria-hidden="true">→</span></Link>
              {confirmandoCancelamento === inscricao.editalId
                ? <div className="curso-card__confirmacao" role="group" aria-label={`Confirmar cancelamento de ${inscricao.titulo}`}>
                  <p>Cancelar a inscrição? Seu progresso fica guardado se você voltar.</p>
                  <div>
                    <button type="button" className="botao-link botao-link--perigo" disabled={ocupado !== null} onClick={() => agir(inscricao.editalId, () => cancelarInscricao(token, inscricao.editalId), 'Inscrição cancelada. Seu progresso continua guardado.', 'Não foi possível cancelar a inscrição.')}>Cancelar inscrição</button>
                    <button type="button" className="botao-link botao-link--secundario" onClick={() => setConfirmandoCancelamento(null)}>Manter curso</button>
                  </div>
                </div>
                : <div className="curso-card__acoes">
                  {!inscricao.emFoco && <button type="button" className="curso-card__acao" disabled={ocupado !== null} onClick={() => agir(inscricao.editalId, () => definirFoco(token, inscricao.editalId), `${inscricao.titulo} agora é o seu curso em foco.`, 'Não foi possível definir o curso em foco.')}>Definir como foco</button>}
                  <Link className="curso-card__acao" to={`/planner?curso=${inscricao.editalId}`}>Ajustar plano</Link>
                  <button type="button" className="curso-card__acao" onClick={() => setConfirmandoCancelamento(inscricao.editalId)}>Cancelar inscrição</button>
                </div>}
            </div>
          </article>)}
        </div>}
      </section>

      <section className="cursos-secao" id="explorar-cursos" aria-labelledby="titulo-explorar">
        <div className="cursos-secao__cabecalho"><h2 id="titulo-explorar">Explorar cursos</h2><p>Inscreva-se em quantos cursos quiser: cada um tem plano e progresso próprios, e o cronograma combina todos.</p></div>
        {!dados.editais.length && <div className="cursos-vazio"><h2>Seu espaço de estudos está pronto</h2><p>Quando um edital for disponibilizado, ele aparecerá aqui para você se inscrever.</p></div>}
        {dados.editais.length > 0 && !vitrine.length && <p className="cursos-secao__vazio">{termo ? `Nenhum outro curso encontrado para “${termo}”.` : 'Você já está inscrito em todos os cursos disponíveis.'}</p>}
        {vitrine.length > 0 && <div className="cursos-grade">
          {vitrine.map((edital, indice) => <article className="curso-card" key={edital.id}>
            <CapaDoCurso titulo={edital.titulo} indice={indice + meus.length} />
            <div className="curso-card__corpo">
              <div className="curso-card__meta"><span>{edital.orgao}</span><span>{edital.ano}</span></div>
              <h2>{edital.titulo}</h2>
              <p>{edital.disciplinas.length} disciplinas</p>
              <button type="button" className="botao-link curso-card__inscrever" disabled={ocupado !== null}
                onClick={() => agir(edital.id, () => inscrever(token, edital.id), `Inscrição feita em ${edital.titulo}.`, 'Não foi possível concluir a inscrição.', () => navigate(`/curso/${edital.id}`))}>
                {ocupado === edital.id ? 'Inscrevendo...' : 'Inscrever-se'}
              </button>
              <Link className="curso-card__acessar" to={`/curso/${edital.id}`} aria-label={`Ver conteúdo de ${edital.titulo}`}>Ver conteúdo <span aria-hidden="true">→</span></Link>
            </div>
          </article>)}
        </div>}
      </section>
    </>}
  </main>
}
