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
import { CabecalhoDaPagina, EstadoSemDados, Painel } from './componentes/Pagina'

type Props = { token: string; onEncerrarSessao: (motivo?: string) => void }
type DadosDoPlanner = { inscricoes: Inscricao[]; plano: Plano | null }

const ROTULOS: Record<Prioridade, string> = { BAIXA: 'Baixa', NORMAL: 'Normal', ALTA: 'Alta' }
const OPCOES: Prioridade[] = ['BAIXA', 'NORMAL', 'ALTA']

function metaValida(meta: string): boolean {
  const horas = Number(meta)
  return meta.trim() !== '' && Number.isInteger(horas) && horas >= 1 && horas <= 168
}

/** Resumo do plano salvo: o que o aluno precisa ver primeiro ao voltar. */
function ResumoDoPlano({ plano }: { plano: Plano }) {
  const total = plano.disciplinas.reduce((soma, d) => soma + d.minutosSemanais, 0)
  const maior = Math.max(1, ...plano.disciplinas.map(d => d.minutosSemanais))
  return <Painel titulo="Plano semanal salvo" id="titulo-plano-salvo" acao={<Link to={`/curso/${plano.edital.id}`}>Ver conteúdo no curso</Link>}>
    <p className="planner-resumo__edital">{plano.edital.titulo} — {plano.edital.ano}</p>
    <p>Meta: <strong>{plano.metaHorasSemanais}h por semana</strong> · Total distribuído: <strong>{formatarTempo(total)}</strong> · cerca de <strong>{formatarTempo(Math.round(total / 7))}</strong> por dia.</p>
    <ul className="planner-distribuicao">
      {plano.disciplinas.map(d => <li key={d.disciplinaId}>
        <span className="planner-distribuicao__nome">{d.nome}</span>
        <span className={`selo planner-selo--${d.prioridade.toLowerCase()}`}>{ROTULOS[d.prioridade]}</span>
        <span className="planner-distribuicao__tempo">{formatarTempo(d.minutosSemanais)}</span>
        <span className="planner-distribuicao__barra" aria-hidden="true"><span style={{ width: `${(d.minutosSemanais / maior) * 100}%` }} /></span>
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

  return <section className="painel" aria-labelledby="titulo-ajustar">
    <header className="painel__cabecalho"><h2 id="titulo-ajustar">Ajustar plano</h2></header>
    <form className="planner-formulario" onSubmit={evento => { evento.preventDefault(); void salvar() }} noValidate>
      <fieldset className="planner-campos" disabled={salvando}>
        <fieldset className="planner-etapa">
          <legend><span className="planner-etapa__numero" aria-hidden="true">1</span>Meta semanal</legend>
          <CampoFormulario
            id="planner-meta"
            rotulo="Meta semanal (horas)"
            erro={erros.metaHorasSemanais}
            ajuda={metaValida(meta)
              ? `Cerca de ${formatarTempo(Math.round((Number(meta) * 60) / 7))} por dia, estudando todos os dias. Ajustar este plano não altera o perfil.`
              : 'Informe quantas horas por semana você quer dedicar a este curso.'}
          >
            <input type="number" min={1} max={168} step={1} inputMode="numeric" value={meta} onChange={evento => { setMeta(evento.target.value); setSalvoAgora(false) }} />
          </CampoFormulario>
        </fieldset>

        <fieldset className="planner-etapa">
          <legend><span className="planner-etapa__numero" aria-hidden="true">2</span>Prioridades por disciplina</legend>
          <p className="painel__nota">Prioridade alta recebe o triplo do tempo da baixa (pesos 1, 2 e 3). O tempo ao lado é uma prévia da divisão da sua meta.</p>
          <div className="planner-atalhos" role="group" aria-label="Definir todas as prioridades">
            {OPCOES.map(opcao => <button key={opcao} type="button" className="botao-link botao-link--secundario" onClick={() => definirTodas(opcao)}>Todas {ROTULOS[opcao].toLowerCase()}</button>)}
          </div>
          <ul className="planner-prioridades">
            {edital.disciplinas.map(d => <li key={d.id}>
              <fieldset className="planner-prioridade">
                <legend className="visualmente-oculto">Prioridade — {d.nome}</legend>
                <span className="planner-prioridade__nome" aria-hidden="true">{d.nome}</span>
                <span className="planner-segmentos">
                  {OPCOES.map(opcao => <label key={opcao} className="planner-segmento">
                    <input type="radio" name={`prioridade-${d.id}`} value={opcao} checked={prioridadeDe(d.id) === opcao} onChange={() => { setPrioridades(atual => ({ ...atual, [d.id]: opcao })); setSalvoAgora(false) }} />
                    <span>{ROTULOS[opcao]}</span>
                  </label>)}
                </span>
                <span className="planner-prioridade__previa">{previa[d.id] !== undefined ? formatarTempo(previa[d.id]) : '—'}</span>
              </fieldset>
            </li>)}
          </ul>
        </fieldset>

        {erro && <Notificacao tipo="erro" mensagem={erro} onFechar={() => setErro(null)} />}
        <div className="planner-salvar">
          {alterado && !salvando && <p className="planner-pendente" role="status">Você tem alterações não salvas.</p>}
          <Botao type="submit" carregando={salvando} disabled={!alterado}>{salvando ? 'Salvando...' : alterado ? 'Salvar alterações' : 'Plano em dia'}</Botao>
        </div>
      </fieldset>
    </form>
    {salvoAgora && <Notificacao tipo="sucesso" onFechar={() => setSalvoAgora(false)}
      mensagem={<>Plano semanal gerado e salvo. <Link to="/cronograma">Atualize o cronograma</Link> para distribuir as atividades da semana.</>} />}
  </section>
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

  return <main className="tela tela-pagina">
    <CabecalhoDaPagina
      sobretitulo="ESTUDAR"
      titulo="Planner de estudos"
      descricao="Cada curso tem sua meta semanal e suas prioridades. O cronograma combina todos os cursos."
      acoes={plano && <>
        <Link className="botao-link" to={`/curso/${plano.edital.id}`}>Ir para o curso</Link>
        <Link className="botao-link botao-link--secundario" to="/cronograma">Ver cronograma</Link>
      </>}
    />
    {carregando && !dados && <EstadoCarregando>Carregando planner...</EstadoCarregando>}
    {erro && <><Aviso tipo="erro">{erro}</Aviso><Botao type="button" variante="secundario" onClick={recarregar}>Tentar novamente</Botao></>}
    {aviso && <Notificacao tipo="erro" mensagem={aviso} onFechar={() => setAviso(null)} />}
    {dados && !inscricoes.length && <EstadoSemDados titulo="Você ainda não está inscrito em nenhum curso" acao={{ texto: 'Explorar cursos', para: '/app#explorar-cursos' }}>
      Inscreva-se em um curso para montar o plano de estudos dele.
    </EstadoSemDados>}
    {dados && inscricoes.length > 0 && <div className="planner-layout">
      <nav className="planner-cursos" aria-label="Cursos inscritos">
        {inscricoes.map(i => <NavLink key={i.editalId} to={`/planner?curso=${i.editalId}`}
          className={() => `planner-curso${plano?.edital.id === i.editalId ? ' planner-curso--ativo' : ''}`}
          aria-current={plano?.edital.id === i.editalId ? 'page' : undefined}>
          <span>{i.titulo}</span>{i.emFoco && <span className="selo">Em foco</span>}
        </NavLink>)}
        <Link className="planner-curso planner-curso--novo" to="/app#explorar-cursos">+ Adicionar curso</Link>
      </nav>
      {!plano && <EstadoSemDados titulo="Curso não encontrado nos seus cursos" acao={{ texto: 'Ver meus cursos', para: '/app' }}>
        Você não está inscrito neste curso.
      </EstadoSemDados>}
      {plano && <>
        {!plano.emFoco && <div className="planner-foco" role="status">
          <p>As telas de Desempenho e Questões abrem o curso em foco por padrão.</p>
          <button type="button" className="botao-link botao-link--secundario" onClick={tornarFoco}>Definir este curso como foco</button>
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
    </div>}
  </main>
}
