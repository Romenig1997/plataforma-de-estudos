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
import { CabecalhoDaPagina, Conteudo } from './componentes/Pagina'
import { ArrowRightIcon, BookOpenIcon, ClockIcon, CompassIcon, GraduationCapIcon, LayersIcon, PlusIcon, SearchIcon, ShieldCheckIcon, StarIcon, TargetIcon, TrendingUpIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

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
    return <div className="flex flex-col gap-3 rounded-lg border border-destructive/25 bg-destructive-soft p-3" role="group" aria-label={`Confirmar cancelamento de ${inscricao.titulo}`}>
      <p className="text-sm text-destructive">Cancelar a inscrição? Seu progresso fica guardado se você voltar.</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="destructive" size="sm" disabled={ocupado !== null} onClick={() => agir(inscricao.editalId, () => cancelarInscricao(token, inscricao.editalId), 'Inscrição cancelada. Seu progresso continua guardado.', 'Não foi possível cancelar a inscrição.')}>Cancelar inscrição</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setConfirmandoCancelamento(null)}>Manter curso</Button>
      </div>
    </div>
  }

  const textoContinuar = (i: Inscricao) => (i.topicosConcluidos ? 'Continuar' : 'Começar')

  return <Conteudo>
    <CabecalhoDaPagina
      sobretitulo="MINHA PREPARAÇÃO"
      titulo="Meus cursos"
      descricao={usuario ? `Olá, ${usuario.nome.split(' ')[0]}. Continue de onde parou ou explore novos cursos.` : 'Continue de onde parou ou explore novos cursos.'}
      acoes={(usuario?.perfil === 'ADMIN' || vitrine.length > 0) && <>
        {usuario?.perfil === 'ADMIN' && <Button asChild variant="outline"><Link to="/admin"><ShieldCheckIcon aria-hidden="true" />Área administrativa</Link></Button>}
        {vitrine.length > 0 && <Button asChild variant="outline"><a href="#explorar-cursos"><CompassIcon aria-hidden="true" />Explorar cursos</a></Button>}
      </>}
    />
    {erro && <div className="flex flex-col items-start gap-3"><Aviso tipo="erro">{erro}</Aviso><Botao type="button" variante="secundario" onClick={recarregar}>Tentar novamente</Botao></div>}
    {carregando && !dados && <EstadoCarregando formato="cartoes">Carregando seus cursos...</EstadoCarregando>}
    {aviso && <Notificacao tipo={aviso.tipo} mensagem={aviso.texto} onFechar={() => setAviso(null)} />}
    {termo && dados && <p className="flex flex-wrap items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm" role="status"><SearchIcon className="size-4 text-muted-foreground" aria-hidden="true" />Resultados para “{termo}”. <Link className="font-semibold text-primary hover:underline" to="/app">Limpar pesquisa</Link></p>}

    {dados && <>
      {inscricoes.length > 0 && <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3" aria-label="Resumo dos seus estudos">
        {[
          { rotulo: 'Cursos inscritos', valor: String(inscricoes.length), icone: BookOpenIcon },
          { rotulo: 'Meta da semana', valor: `${metaTotal}h`, icone: ClockIcon },
          { rotulo: 'Progresso médio', valor: percentual(progressoMedio), icone: TrendingUpIcon },
        ].map(({ rotulo, valor, icone: Icone }) => <div key={rotulo} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 rounded-xl border bg-card p-5 shadow-xs">
          <dt className="contents text-sm text-muted-foreground"><span className="row-span-2 flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground" aria-hidden="true"><Icone className="size-5" /></span>{rotulo}</dt>
          <dd className="col-start-2 text-2xl font-bold tracking-tight tabular-nums">{valor}</dd>
        </div>)}
      </dl>}

      <section className="flex flex-col gap-4" aria-label="Cursos em que você está inscrito">
        <h2 className="text-lg font-semibold">{foco ? 'Continue de onde parou' : 'Seus cursos'}</h2>
        {!inscricoes.length && <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-card px-6 py-10 text-center"><span className="mb-1 flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground" aria-hidden="true"><GraduationCapIcon className="size-5" /></span><h3 className="font-semibold">Você ainda não está inscrito em nenhum curso</h3><p className="max-w-md text-sm text-muted-foreground">Escolha um curso abaixo e inscreva-se para montar seu plano, marcar aulas e acompanhar seu desempenho.</p>{usuario?.perfil === 'ADMIN' && !dados.editais.length && <Button asChild variant="link"><Link to="/admin/editais">Gerenciar editais</Link></Button>}</div>}
        {inscricoes.length > 0 && !meus.length && <div className="rounded-xl border border-dashed bg-card px-6 py-8 text-center"><h3 className="font-semibold">Nenhum dos seus cursos corresponde à pesquisa</h3></div>}

        {foco && <CartaoDeCurso destaque editalId={foco.editalId} titulo={foco.titulo} sigla={foco.sigla} bannerVersao={foco.bannerVersao}
          orgao={foco.orgao} ano={foco.ano} selo={<Badge variant="warning" className="normal-case"><StarIcon aria-hidden="true" />Em foco</Badge>} menu={opcoesDe(foco)}>
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><TargetIcon className="size-4" aria-hidden="true" />Meta de {foco.metaHorasSemanais}h por semana</p>
          <ProgressoDoCurso titulo={foco.titulo} concluidos={foco.topicosConcluidos} total={foco.totalTopicos} progresso={foco.progresso} />
          {confirmandoCancelamento === foco.editalId
            ? confirmacao(foco)
            : <div className="mt-auto flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button asChild><Link to={`/curso/${foco.editalId}`} aria-label={`${textoContinuar(foco)} ${foco.titulo}`}>{foco.topicosConcluidos ? 'Continuar estudando' : 'Começar a estudar'}<ArrowRightIcon aria-hidden="true" /></Link></Button>
              <Button asChild variant="outline"><Link to="/cronograma">Cronograma</Link></Button>
              <Button asChild variant="outline"><Link to={`/planner?curso=${foco.editalId}`}>Ajustar plano</Link></Button>
            </div>}
        </CartaoDeCurso>}

        {outros.length > 0 && <>
          {foco && <h2 className="mt-2 text-base font-semibold text-muted-foreground">Seus outros cursos</h2>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {outros.map(inscricao => <CartaoDeCurso key={inscricao.editalId} editalId={inscricao.editalId} titulo={inscricao.titulo} sigla={inscricao.sigla}
              bannerVersao={inscricao.bannerVersao} orgao={inscricao.orgao} ano={inscricao.ano} menu={opcoesDe(inscricao)}>
              <ProgressoDoCurso titulo={inscricao.titulo} concluidos={inscricao.topicosConcluidos} total={inscricao.totalTopicos} progresso={inscricao.progresso} />
              {confirmandoCancelamento === inscricao.editalId
                ? confirmacao(inscricao)
                : <div className="mt-auto flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">Meta {inscricao.metaHorasSemanais}h/sem</span>
                  <Button asChild size="sm"><Link to={`/curso/${inscricao.editalId}`} aria-label={`${textoContinuar(inscricao)} ${inscricao.titulo}`}>{textoContinuar(inscricao)}</Link></Button>
                </div>}
            </CartaoDeCurso>)}
          </div>
        </>}
      </section>

      <section className="flex scroll-mt-20 flex-col gap-4" id="explorar-cursos" aria-labelledby="titulo-explorar">
        <div className="flex flex-col gap-1"><h2 id="titulo-explorar" className="text-lg font-semibold">Explorar cursos</h2><p className="text-sm text-muted-foreground">Inscreva-se em quantos cursos quiser: cada um tem plano e progresso próprios, e o cronograma combina todos.</p></div>
        {!dados.editais.length && <div className="rounded-xl border border-dashed bg-card px-6 py-10 text-center"><h3 className="font-semibold">Seu espaço de estudos está pronto</h3><p className="mt-1 text-sm text-muted-foreground">Quando um edital for disponibilizado, ele aparecerá aqui para você se inscrever.</p></div>}
        {dados.editais.length > 0 && !vitrine.length && <p className="rounded-xl border border-dashed bg-card px-6 py-6 text-center text-sm text-muted-foreground">{termo ? `Nenhum outro curso encontrado para “${termo}”.` : 'Você já está inscrito em todos os cursos disponíveis.'}</p>}
        {vitrine.length > 0 && <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {vitrine.map(edital => <CartaoDeCurso key={edital.id} editalId={edital.id} titulo={edital.titulo} sigla={edital.sigla}
            bannerVersao={edital.bannerVersao} orgao={edital.orgao} ano={edital.ano}>
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><LayersIcon className="size-4" aria-hidden="true" />{edital.disciplinas.length} disciplinas · {totalDeTopicos(edital)} tópicos</p>
            <div className="mt-auto flex items-center justify-between gap-3">
              <Button asChild variant="link" size="sm"><Link to={`/curso/${edital.id}`} aria-label={`Ver conteúdo de ${edital.titulo}`}>Ver conteúdo</Link></Button>
              <Button type="button" size="sm" variant="outline" disabled={ocupado !== null}
                onClick={() => agir(edital.id, () => inscrever(token, edital.id), `Inscrição feita em ${edital.titulo}.`, 'Não foi possível concluir a inscrição.', () => navigate(`/curso/${edital.id}`))}>
                {ocupado === edital.id ? 'Inscrevendo...' : <><PlusIcon aria-hidden="true" />Inscrever-se</>}
              </Button>
            </div>
          </CartaoDeCurso>)}
        </div>}
      </section>
    </>}
  </Conteudo>
}
