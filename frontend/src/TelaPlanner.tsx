import { useCallback, useState } from 'react'
import { Link, NavLink, useSearchParams } from 'react-router-dom'
import { mensagemDaFalha } from './api'
import { definirFoco, listarInscricoes, type Inscricao } from './cursos'
import { buscarPlano, distribuirMinutos, formatarTempo, gerarPlano, type Plano, type Prioridade } from './planner'
import { ErroDeApi } from './sessao'
import { useRecurso } from './useRecurso'
import Aviso from './componentes/Aviso'
import Notificacao from './componentes/Notificacao'
import Botao from './componentes/Botao'
import CampoFormulario from './componentes/CampoFormulario'
import EstadoCarregando from './componentes/EstadoCarregando'
import { CabecalhoDaPagina, Conteudo, EstadoSemDados, Painel } from './componentes/Pagina'
import { BookOpenIcon, CircleDotIcon, PlusIcon, StarIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

type Props = { token: string; onEncerrarSessao: (motivo?: string) => void }
type DadosDoPlanner = { inscricoes: Inscricao[]; plano: Plano | null }

const ROTULOS: Record<Prioridade, string> = { BAIXA: 'Baixa', NORMAL: 'Normal', ALTA: 'Alta' }
const OPCOES: Prioridade[] = ['BAIXA', 'NORMAL', 'ALTA']
const VARIANTE_DA_PRIORIDADE = { BAIXA: 'secondary', NORMAL: 'info', ALTA: 'warning' } as const

function metaValida(meta: string): boolean {
  const horas = Number(meta)
  return meta.trim() !== '' && Number.isInteger(horas) && horas >= 1 && horas <= 168
}

/** Resumo do plano salvo: o que o aluno precisa ver primeiro ao voltar. */
function ResumoDoPlano({ plano }: { plano: Plano }) {
  const total = plano.disciplinas.reduce((soma, d) => soma + d.minutosSemanais, 0)
  const maior = Math.max(1, ...plano.disciplinas.map(d => d.minutosSemanais))
  return <Painel titulo="Plano semanal salvo" id="titulo-plano-salvo" acao={<Button asChild variant="link" size="sm"><Link to={`/curso/${plano.edital.id}`}>Ver conteúdo no curso</Link></Button>}>
    <p className="text-sm font-medium text-muted-foreground">{plano.edital.titulo} — {plano.edital.ano}</p>
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {[
        { rotulo: 'Meta', valor: `${plano.metaHorasSemanais}h por semana` },
        { rotulo: 'Total distribuído', valor: formatarTempo(total) },
        { rotulo: 'Média por dia', valor: `cerca de ${formatarTempo(Math.round(total / 7))}` },
      ].map(item => <div key={item.rotulo} className="flex flex-col gap-0.5 rounded-lg bg-muted/60 px-4 py-3">
        <dt className="text-xs text-muted-foreground">{item.rotulo}</dt>
        <dd className="font-semibold">{item.valor}</dd>
      </div>)}
    </dl>
    <ul className="flex flex-col gap-3">
      {plano.disciplinas.map(d => <li key={d.disciplinaId} className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2 text-sm">
          <span className="min-w-0 flex-1 truncate font-medium">{d.nome}</span>
          <Badge variant={VARIANTE_DA_PRIORIDADE[d.prioridade]}>{ROTULOS[d.prioridade]}</Badge>
          <span className="w-16 text-right text-muted-foreground tabular-nums">{formatarTempo(d.minutosSemanais)}</span>
        </div>
        <span className="h-2 overflow-hidden rounded-full bg-primary/10" aria-hidden="true"><span className="block h-full rounded-full bg-primary" style={{ width: `${(d.minutosSemanais / maior) * 100}%` }} /></span>
      </li>)}
    </ul>
  </Painel>
}

type FormularioProps = {
  token: string
  plano: Plano
  onEncerrarSessao: (motivo?: string) => void
  onSalvo: (plano: Plano) => void
}

/**
 * Ajuste do plano de um curso: meta semanal e prioridades. Compara o rascunho
 * com o plano salvo para indicar alteracoes pendentes.
 */
function FormularioDoPlano({ token, plano, onEncerrarSessao, onSalvo }: FormularioProps) {
  const edital = plano.edital
  const [meta, setMeta] = useState(() => String(plano.metaHorasSemanais))
  const [prioridades, setPrioridades] = useState<Record<number, Prioridade>>(() =>
    Object.fromEntries(plano.disciplinas.map(d => [d.disciplinaId, d.prioridade])))
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [salvoAgora, setSalvoAgora] = useState(false)

  const prioridadeDe = (id: number) => prioridades[id] ?? 'NORMAL'
  const entradas = edital.disciplinas.map(d => ({ disciplinaId: d.id, prioridade: prioridadeDe(d.id) }))
  const previa = metaValida(meta) ? distribuirMinutos(Number(meta), entradas) : {}
  const alterado = Number(meta) !== plano.metaHorasSemanais || plano.disciplinas.some(d => prioridadeDe(d.disciplinaId) !== d.prioridade)

  function definirTodas(prioridade: Prioridade) {
    setPrioridades(Object.fromEntries(edital.disciplinas.map(d => [d.id, prioridade])))
    setSalvoAgora(false)
  }

  async function salvar() {
    const novosErros: Record<string, string> = {}
    if (!metaValida(meta)) novosErros.metaHorasSemanais = 'Informe uma meta inteira de 1 a 168 horas por semana.'
    setErros(novosErros)
    setErro(null)
    setSalvoAgora(false)
    if (Object.keys(novosErros).length) return
    setSalvando(true)
    try {
      const gerado = await gerarPlano(token, {
        editalId: edital.id,
        metaHorasSemanais: Number(meta),
        prioridades: edital.disciplinas.map(d => ({ disciplinaId: d.id, prioridade: prioridadeDe(d.id) })),
      })
      onSalvo(gerado)
      setSalvoAgora(true)
    } catch (falha: unknown) {
      if (falha instanceof ErroDeApi) setErros(Object.fromEntries(falha.erros.map(e => [e.campo, e.mensagem])))
      setErro(mensagemDaFalha(falha, onEncerrarSessao, 'Não foi possível salvar o plano. Tente novamente.'))
    } finally {
      setSalvando(false)
    }
  }

  return <Card className="gap-5" role="region" aria-labelledby="titulo-ajustar">
    <CardHeader><CardTitle><h2 id="titulo-ajustar" className="text-base font-semibold">Ajustar plano</h2></CardTitle></CardHeader>
    <CardContent>
    <form onSubmit={evento => { evento.preventDefault(); void salvar() }} noValidate>
      <fieldset className="flex min-w-0 flex-col gap-6 disabled:opacity-70" disabled={salvando}>
        <fieldset className="flex min-w-0 flex-col gap-3">
          <legend className="mb-3 flex items-center gap-2 font-semibold"><span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground" aria-hidden="true">1</span>Meta semanal</legend>
          <CampoFormulario
            id="planner-meta"
            rotulo="Meta semanal (horas)"
            erro={erros.metaHorasSemanais}
            className="max-w-xs"
            ajuda={metaValida(meta)
              ? `Cerca de ${formatarTempo(Math.round((Number(meta) * 60) / 7))} por dia, estudando todos os dias. Ajustar este plano não altera o perfil.`
              : 'Informe quantas horas por semana você quer dedicar a este curso.'}
          >
            <Input type="number" min={1} max={168} step={1} inputMode="numeric" value={meta} onChange={evento => { setMeta(evento.target.value); setSalvoAgora(false) }} />
          </CampoFormulario>
        </fieldset>

        <Separator />

        <fieldset className="flex min-w-0 flex-col gap-4">
          <legend className="mb-3 flex items-center gap-2 font-semibold"><span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground" aria-hidden="true">2</span>Prioridades por disciplina</legend>
          <p className="text-sm text-muted-foreground">Prioridade alta recebe o triplo do tempo da baixa (pesos 1, 2 e 3). O tempo ao lado é uma prévia da divisão da sua meta.</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Definir todas as prioridades">
            {OPCOES.map(opcao => <Button key={opcao} type="button" variant="outline" size="sm" onClick={() => definirTodas(opcao)}>Todas {ROTULOS[opcao].toLowerCase()}</Button>)}
          </div>
          <ul className="flex flex-col divide-y rounded-lg border">
            {edital.disciplinas.map(d => <li key={d.id}>
              <fieldset className="flex min-w-0 flex-col gap-3 p-3 sm:flex-row sm:items-center">
                <legend className="sr-only">Prioridade — {d.nome}</legend>
                <span className="min-w-0 flex-1 text-sm font-medium" aria-hidden="true">{d.nome}</span>
                <div className="flex items-center gap-3">
                  <span className="inline-flex flex-1 rounded-lg bg-muted p-1 sm:flex-none">
                    {OPCOES.map(opcao => <label key={opcao} className="relative flex-1 cursor-pointer sm:flex-none">
                      <input className="peer absolute inset-0 z-10 cursor-pointer appearance-none opacity-0" type="radio" name={`prioridade-${d.id}`} value={opcao} checked={prioridadeDe(d.id) === opcao} onChange={() => { setPrioridades(atual => ({ ...atual, [d.id]: opcao })); setSalvoAgora(false) }} />
                      <span className="flex h-8 items-center justify-center rounded-md px-3 text-xs font-medium text-muted-foreground transition-colors peer-checked:bg-card peer-checked:text-foreground peer-checked:shadow-sm peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50">{ROTULOS[opcao]}</span>
                    </label>)}
                  </span>
                  <span className="w-16 text-right text-sm whitespace-nowrap text-muted-foreground tabular-nums">{previa[d.id] !== undefined ? formatarTempo(previa[d.id]) : '—'}</span>
                </div>
              </fieldset>
            </li>)}
          </ul>
        </fieldset>

        {erro && <Notificacao tipo="erro" mensagem={erro} onFechar={() => setErro(null)} />}
        <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-end">
          {alterado && !salvando && <p className="flex items-center gap-2 text-sm text-warning" role="status"><CircleDotIcon className="size-4" aria-hidden="true" />Você tem alterações não salvas.</p>}
          <Botao type="submit" carregando={salvando} disabled={!alterado} className="w-full sm:w-auto">{salvando ? 'Salvando...' : alterado ? 'Salvar alterações' : 'Plano em dia'}</Botao>
        </div>
      </fieldset>
    </form>
    </CardContent>
    {salvoAgora && <Notificacao tipo="sucesso" onFechar={() => setSalvoAgora(false)}
      mensagem={<>Plano semanal gerado e salvo. <Link to="/cronograma">Atualize o cronograma</Link> para distribuir as atividades da semana.</>} />}
  </Card>
}

export default function TelaPlanner({ token, onEncerrarSessao }: Props) {
  const [parametros] = useSearchParams()
  const editalId = Number(parametros.get('curso')) || null
  const carregar = useCallback(async (): Promise<DadosDoPlanner> => {
    const [inscricoes, plano] = await Promise.all([listarInscricoes(token), buscarPlano(token, editalId)])
    return { inscricoes, plano }
  }, [token, editalId])
  const { dados, definirDados, carregando, erro, recarregar } = useRecurso(carregar, onEncerrarSessao, 'Não foi possível carregar o planner. Tente novamente.')
  const [aviso, setAviso] = useState<string | null>(null)
  const plano = dados?.plano ?? null
  const inscricoes = dados?.inscricoes ?? []

  async function tornarFoco() {
    if (!plano) return
    setAviso(null)
    try {
      await definirFoco(token, plano.edital.id)
      recarregar()
    } catch (falha: unknown) {
      setAviso(mensagemDaFalha(falha, onEncerrarSessao, 'Não foi possível definir o curso em foco.'))
    }
  }

  return <Conteudo>
    <CabecalhoDaPagina
      sobretitulo="ESTUDAR"
      titulo="Planner de estudos"
      descricao="Cada curso tem sua meta semanal e suas prioridades. O cronograma combina todos os cursos."
      acoes={plano && <>
        <Button asChild><Link to={`/curso/${plano.edital.id}`}>Ir para o curso</Link></Button>
        <Button asChild variant="outline"><Link to="/cronograma">Ver cronograma</Link></Button>
      </>}
    />
    {carregando && !dados && <EstadoCarregando formato="pagina">Carregando planner...</EstadoCarregando>}
    {erro && <div className="flex flex-col items-start gap-3"><Aviso tipo="erro">{erro}</Aviso><Botao type="button" variante="secundario" onClick={recarregar}>Tentar novamente</Botao></div>}
    {aviso && <Notificacao tipo="erro" mensagem={aviso} onFechar={() => setAviso(null)} />}
    {dados && !inscricoes.length && <EstadoSemDados titulo="Você ainda não está inscrito em nenhum curso" icone={<BookOpenIcon />} acao={{ texto: 'Explorar cursos', para: '/app#explorar-cursos' }}>
      Inscreva-se em um curso para montar o plano de estudos dele.
    </EstadoSemDados>}
    {dados && inscricoes.length > 0 && <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <nav className="flex gap-2 overflow-x-auto pb-1 lg:sticky lg:top-20 lg:flex-col lg:overflow-visible lg:pb-0" aria-label="Cursos inscritos">
        {inscricoes.map(i => <NavLink key={i.editalId} to={`/planner?curso=${i.editalId}`}
          className={() => cn('flex shrink-0 items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent', plano?.edital.id === i.editalId ? 'border-primary/40 bg-accent text-accent-foreground' : 'bg-card')}
          aria-current={plano?.edital.id === i.editalId ? 'page' : undefined}>
          <span className="truncate">{i.titulo}</span>{i.emFoco && <Badge variant="warning">Em foco</Badge>}
        </NavLink>)}
        <Link className="flex shrink-0 items-center gap-2 rounded-lg border border-dashed px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary" to="/app#explorar-cursos"><PlusIcon className="size-4" aria-hidden="true" />Adicionar curso</Link>
      </nav>
      <div className="flex min-w-0 flex-col gap-6">
        {!plano && <EstadoSemDados titulo="Curso não encontrado nos seus cursos" acao={{ texto: 'Ver meus cursos', para: '/app' }}>
          Você não está inscrito neste curso.
        </EstadoSemDados>}
        {plano && <>
          {!plano.emFoco && <div className="flex flex-col gap-3 rounded-xl border border-info/25 bg-info-soft p-4 sm:flex-row sm:items-center" role="status">
            <p className="flex-1 text-sm text-info">As telas de Desempenho e Questões abrem o curso em foco por padrão.</p>
            <Button type="button" variant="outline" size="sm" onClick={tornarFoco}><StarIcon aria-hidden="true" />Definir este curso como foco</Button>
          </div>}
          <ResumoDoPlano plano={plano} />
          <FormularioDoPlano
            key={plano.edital.id}
            token={token}
            plano={plano}
            onEncerrarSessao={onEncerrarSessao}
            onSalvo={novo => definirDados({ ...dados, plano: novo })}
          />
        </>}
      </div>
    </div>}
  </Conteudo>
}
