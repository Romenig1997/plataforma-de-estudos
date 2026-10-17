import { useCallback, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { mensagemDaFalha } from './api'
import { cancelarInscricao, definirFoco, inscrever, listarInscricoes, type Inscricao } from './cursos'
import { listarEditaisAprovados, type EditalAprovado } from './editais'
import { buscarSessaoAtual, type Usuario } from './sessao'
import { useRecurso } from './useRecurso'
import Aviso from './componentes/Aviso'
import Notificacao from './componentes/Notificacao'
import Botao from './componentes/Botao'
import EstadoCarregando from './componentes/EstadoCarregando'
import CartaoDeCurso, { ProgressoDoCurso, type OpcaoDoMenu } from './componentes/CartaoDeCurso'

type Props = { token: string; onEncerrarSessao: (motivo?: string) => void }
type DadosDosCursos = { usuario: Usuario; editais: EditalAprovado[]; inscricoes: Inscricao[] }

const percentual = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
/** Topicos de um edital da vitrine: assuntos sem subassuntos ou os proprios subassuntos. */
const totalDeTopicos = (edital: EditalAprovado) =>
  edital.disciplinas.reduce((soma, d) => soma + d.assuntos.reduce((s, a) => s + Math.max(1, a.subassuntos.length), 0), 0)

/**
 * Meus cursos: resumo, o curso em foco em destaque, os demais cursos
 * inscritos e a vitrine dos editais para se inscrever.
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
  const meus = inscricoes.filter(i => combina(`${i.titulo} ${i.orgao} ${i.sigla} ${i.ano}`))
  const foco = meus.find(i => i.emFoco) ?? null
  const outros = meus.filter(i => i !== foco)
  const vitrine = (dados?.editais ?? []).filter(e => !inscritos.has(e.id) && combina(`${e.titulo} ${e.orgao} ${e.sigla} ${e.ano}`))
  const metaTotal = inscricoes.reduce((soma, i) => soma + i.metaHorasSemanais, 0)
  const progressoMedio = inscricoes.length ? inscricoes.reduce((soma, i) => soma + i.progresso, 0) / inscricoes.length : 0

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

  function opcoesDe(inscricao: Inscricao): OpcaoDoMenu[] {
    return [
      ...(!inscricao.emFoco ? [{ rotulo: 'Definir como foco', desabilitada: ocupado !== null, onSelecionar: () => void agir(inscricao.editalId, () => definirFoco(token, inscricao.editalId), `${inscricao.titulo} agora é o seu curso em foco.`, 'Não foi possível definir o curso em foco.') }] : []),
      { rotulo: 'Ajustar plano', onSelecionar: () => navigate(`/planner?curso=${inscricao.editalId}`) },
      { rotulo: 'Cancelar inscrição', perigo: true, onSelecionar: () => setConfirmandoCancelamento(inscricao.editalId) },
    ]
  }

  /** Confirmacao no proprio card; substitui as acoes enquanto aberta. */
  function confirmacao(inscricao: Inscricao) {
    return <div className="curso-cartao__confirmacao" role="group" aria-label={`Confirmar cancelamento de ${inscricao.titulo}`}>
      <p>Cancelar a inscrição? Seu progresso fica guardado se você voltar.</p>
      <div>
        <button type="button" className="botao-link botao-link--perigo" disabled={ocupado !== null} onClick={() => agir(inscricao.editalId, () => cancelarInscricao(token, inscricao.editalId), 'Inscrição cancelada. Seu progresso continua guardado.', 'Não foi possível cancelar a inscrição.')}>Cancelar inscrição</button>
        <button type="button" className="botao-link botao-link--secundario" onClick={() => setConfirmandoCancelamento(null)}>Manter curso</button>
      </div>
    </div>
  }

  const textoContinuar = (i: Inscricao) => (i.topicosConcluidos ? 'Continuar' : 'Começar')

  return <main className="tela tela-cursos">
    <header className="cursos-cabecalho">
      <div><span className="sobretitulo">MINHA PREPARAÇÃO</span><h1>Meus cursos</h1><p>{usuario ? `Olá, ${usuario.nome.split(' ')[0]}. Continue de onde parou ou explore novos cursos.` : 'Continue de onde parou ou explore novos cursos.'}</p></div>
      <div className="cursos-cabecalho__acoes">
        {usuario?.perfil === 'ADMIN' && <Link className="botao-link botao-link--secundario" to="/admin">Área administrativa</Link>}
        {vitrine.length > 0 && <a className="botao-link botao-link--secundario" href="#explorar-cursos">Explorar cursos</a>}
      </div>
    </header>
    {erro && <><Aviso tipo="erro">{erro}</Aviso><Botao type="button" variante="secundario" onClick={recarregar}>Tentar novamente</Botao></>}
    {carregando && !dados && <EstadoCarregando>Carregando seus cursos...</EstadoCarregando>}
    {aviso && <Notificacao tipo={aviso.tipo} mensagem={aviso.texto} onFechar={() => setAviso(null)} />}
    {termo && dados && <p className="cursos-busca" role="status">Resultados para “{termo}”. <Link to="/app">Limpar pesquisa</Link></p>}

    {dados && <>
      {inscricoes.length > 0 && <dl className="cursos-resumo" aria-label="Resumo dos seus estudos">
        <div><dt>Cursos inscritos</dt><dd>{inscricoes.length}</dd></div>
        <div><dt>Meta da semana</dt><dd>{metaTotal}h</dd></div>
        <div><dt>Progresso médio</dt><dd>{percentual(progressoMedio)}</dd></div>
      </dl>}

      <section className="cursos-secao" aria-label="Cursos em que você está inscrito">
        <h2 className="cursos-secao__titulo">{foco ? 'Continue de onde parou' : 'Seus cursos'}</h2>
        {!inscricoes.length && <div className="cursos-vazio"><h3>Você ainda não está inscrito em nenhum curso</h3><p>Escolha um curso abaixo e inscreva-se para montar seu plano, marcar aulas e acompanhar seu desempenho.</p>{usuario?.perfil === 'ADMIN' && !dados.editais.length && <Link to="/admin/editais">Gerenciar editais</Link>}</div>}
        {inscricoes.length > 0 && !meus.length && <div className="cursos-vazio"><h3>Nenhum dos seus cursos corresponde à pesquisa</h3></div>}

        {foco && <CartaoDeCurso destaque editalId={foco.editalId} titulo={foco.titulo} sigla={foco.sigla} bannerVersao={foco.bannerVersao}
          orgao={foco.orgao} ano={foco.ano} selo={<span className="selo">Em foco</span>} menu={opcoesDe(foco)}>
          <p className="curso-cartao__nota">Meta de {foco.metaHorasSemanais}h por semana</p>
          <ProgressoDoCurso titulo={foco.titulo} concluidos={foco.topicosConcluidos} total={foco.totalTopicos} progresso={foco.progresso} />
          {confirmandoCancelamento === foco.editalId
            ? confirmacao(foco)
            : <div className="curso-cartao__acoes">
              <Link className="botao-link" to={`/curso/${foco.editalId}`} aria-label={`${textoContinuar(foco)} ${foco.titulo}`}>{foco.topicosConcluidos ? 'Continuar estudando' : 'Começar a estudar'}</Link>
              <Link className="botao-link botao-link--secundario" to="/cronograma">Cronograma</Link>
              <Link className="botao-link botao-link--secundario" to={`/planner?curso=${foco.editalId}`}>Ajustar plano</Link>
            </div>}
        </CartaoDeCurso>}

        {outros.length > 0 && <>
          {foco && <h2 className="cursos-secao__titulo cursos-secao__titulo--sub">Seus outros cursos</h2>}
          <div className="cursos-grade">
            {outros.map(inscricao => <CartaoDeCurso key={inscricao.editalId} editalId={inscricao.editalId} titulo={inscricao.titulo} sigla={inscricao.sigla}
              bannerVersao={inscricao.bannerVersao} orgao={inscricao.orgao} ano={inscricao.ano} menu={opcoesDe(inscricao)}>
              <ProgressoDoCurso titulo={inscricao.titulo} concluidos={inscricao.topicosConcluidos} total={inscricao.totalTopicos} progresso={inscricao.progresso} />
              {confirmandoCancelamento === inscricao.editalId
                ? confirmacao(inscricao)
                : <div className="curso-cartao__rodape">
                  <span>Meta {inscricao.metaHorasSemanais}h/sem</span>
                  <Link className="botao-link" to={`/curso/${inscricao.editalId}`} aria-label={`${textoContinuar(inscricao)} ${inscricao.titulo}`}>{textoContinuar(inscricao)}</Link>
                </div>}
            </CartaoDeCurso>)}
          </div>
        </>}
      </section>

      <section className="cursos-secao" id="explorar-cursos" aria-labelledby="titulo-explorar">
        <div className="cursos-secao__cabecalho"><h2 id="titulo-explorar" className="cursos-secao__titulo">Explorar cursos</h2><p>Inscreva-se em quantos cursos quiser: cada um tem plano e progresso próprios, e o cronograma combina todos.</p></div>
        {!dados.editais.length && <div className="cursos-vazio"><h3>Seu espaço de estudos está pronto</h3><p>Quando um edital for disponibilizado, ele aparecerá aqui para você se inscrever.</p></div>}
        {dados.editais.length > 0 && !vitrine.length && <p className="cursos-secao__vazio">{termo ? `Nenhum outro curso encontrado para “${termo}”.` : 'Você já está inscrito em todos os cursos disponíveis.'}</p>}
        {vitrine.length > 0 && <div className="cursos-grade">
          {vitrine.map(edital => <CartaoDeCurso key={edital.id} editalId={edital.id} titulo={edital.titulo} sigla={edital.sigla}
            bannerVersao={edital.bannerVersao} orgao={edital.orgao} ano={edital.ano}>
            <p className="curso-cartao__nota">{edital.disciplinas.length} disciplinas · {totalDeTopicos(edital)} tópicos</p>
            <div className="curso-cartao__rodape">
              <Link className="curso-link" to={`/curso/${edital.id}`} aria-label={`Ver conteúdo de ${edital.titulo}`}>Ver conteúdo</Link>
              <button type="button" className="botao-link botao-link--secundario" disabled={ocupado !== null}
                onClick={() => agir(edital.id, () => inscrever(token, edital.id), `Inscrição feita em ${edital.titulo}.`, 'Não foi possível concluir a inscrição.', () => navigate(`/curso/${edital.id}`))}>
                {ocupado === edital.id ? 'Inscrevendo...' : 'Inscrever-se'}
              </button>
            </div>
          </CartaoDeCurso>)}
        </div>}
      </section>
    </>}
  </main>
}
