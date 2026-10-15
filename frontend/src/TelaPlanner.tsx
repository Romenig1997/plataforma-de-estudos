import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { mensagemDaFalha } from './api'
import { listarEditaisAprovados, type EditalAprovado } from './editais'
import { buscarPerfil } from './perfil'
import { buscarPlano, distribuirMinutos, formatarTempo, gerarPlano, type Plano, type Prioridade } from './planner'
import { ErroDeApi, SessaoEncerrada } from './sessao'
import { useRecurso } from './useRecurso'
import Aviso from './componentes/Aviso'
import Botao from './componentes/Botao'
import CampoFormulario from './componentes/CampoFormulario'
import EstadoCarregando from './componentes/EstadoCarregando'
import { CabecalhoDaPagina, EstadoSemDados, Painel } from './componentes/Pagina'

type Props = { token: string; onEncerrarSessao: (motivo?: string) => void }
type DadosDoPlanner = { editais: EditalAprovado[]; metaDoPerfil: number | null; plano: Plano | null }

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

type FormularioProps = DadosDoPlanner & {
  token: string
  onEncerrarSessao: (motivo?: string) => void
  onSalvo: (plano: Plano) => void
}

/**
 * Formulario do plano. Mantem o rascunho do aluno e compara com o plano salvo
 * para indicar alteracoes pendentes e a troca de edital.
 */
function FormularioDoPlano({ token, onEncerrarSessao, onSalvo, editais, metaDoPerfil, plano }: FormularioProps) {
  const [editalId, setEditalId] = useState(() => (plano ? String(plano.edital.id) : editais.length === 1 ? String(editais[0].id) : ''))
  const [meta, setMeta] = useState(() => String(plano?.metaHorasSemanais ?? metaDoPerfil ?? ''))
  const [prioridades, setPrioridades] = useState<Record<number, Prioridade>>(() =>
    Object.fromEntries(plano?.disciplinas.map(d => [d.disciplinaId, d.prioridade]) ?? []))
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [salvoAgora, setSalvoAgora] = useState<{ trocouEdital: boolean } | null>(null)

  const edital = editais.find(e => e.id === Number(editalId))
  const prioridadeDe = (id: number) => prioridades[id] ?? 'NORMAL'
  const entradas = edital?.disciplinas.map(d => ({ disciplinaId: d.id, prioridade: prioridadeDe(d.id) })) ?? []
  const previa = metaValida(meta) ? distribuirMinutos(Number(meta), entradas) : {}
  const trocaDeEdital = Boolean(plano && edital && plano.edital.id !== edital.id)
  const alterado = !plano || trocaDeEdital || Number(meta) !== plano.metaHorasSemanais
    || plano.disciplinas.some(d => prioridadeDe(d.disciplinaId) !== d.prioridade)

  function escolherEdital(id: string) {
    setEditalId(id)
    setPrioridades(id === String(plano?.edital.id) ? Object.fromEntries(plano?.disciplinas.map(d => [d.disciplinaId, d.prioridade]) ?? []) : {})
    setErros({})
    setSalvoAgora(null)
  }

  function definirTodas(prioridade: Prioridade) {
    setPrioridades(Object.fromEntries(edital?.disciplinas.map(d => [d.id, prioridade]) ?? []))
    setSalvoAgora(null)
  }

  async function salvar() {
    const novosErros: Record<string, string> = {}
    if (!edital) novosErros.editalId = 'Selecione um edital aprovado.'
    if (!metaValida(meta)) novosErros.metaHorasSemanais = 'Informe uma meta inteira de 1 a 168 horas por semana.'
    setErros(novosErros)
    setErro(null)
    setSalvoAgora(null)
    if (Object.keys(novosErros).length || !edital) return
    setSalvando(true)
    try {
      const gerado = await gerarPlano(token, {
        editalId: edital.id,
        metaHorasSemanais: Number(meta),
        prioridades: edital.disciplinas.map(d => ({ disciplinaId: d.id, prioridade: prioridadeDe(d.id) })),
      })
      onSalvo(gerado)
      setSalvoAgora({ trocouEdital: trocaDeEdital })
    } catch (falha: unknown) {
      if (falha instanceof ErroDeApi) setErros(Object.fromEntries(falha.erros.map(e => [e.campo, e.mensagem])))
      setErro(mensagemDaFalha(falha, onEncerrarSessao, 'Não foi possível salvar o plano. Tente novamente.'))
    } finally {
      setSalvando(false)
    }
  }

  const textoDoBotao = salvando ? 'Gerando e salvando...' : !plano ? 'Gerar e salvar plano' : trocaDeEdital ? 'Trocar de edital e salvar' : alterado ? 'Salvar alterações' : 'Plano em dia'

  return <section className="painel" aria-labelledby="titulo-ajustar">
    <header className="painel__cabecalho"><h2 id="titulo-ajustar">{plano ? 'Ajustar plano' : 'Criar seu plano'}</h2></header>
    <form className="planner-formulario" onSubmit={evento => { evento.preventDefault(); void salvar() }} noValidate>
      <fieldset className="planner-campos" disabled={salvando}>
        <fieldset className="planner-etapa" aria-describedby={erros.editalId ? 'planner-edital-erro' : undefined}>
          <legend><span className="planner-etapa__numero" aria-hidden="true">1</span>Edital</legend>
          <div className="planner-editais">
            {editais.map(e => <label key={e.id} className="planner-edital">
              <input type="radio" name="planner-edital" value={e.id} checked={editalId === String(e.id)} onChange={() => escolherEdital(String(e.id))} />
              <span className="planner-edital__corpo">
                <strong>{e.titulo}</strong>
                <span>{e.orgao} · {e.ano} · {e.disciplinas.length} disciplinas</span>
                {plano?.edital.id === e.id && <span className="selo">Plano atual</span>}
              </span>
            </label>)}
          </div>
          {erros.editalId && <p id="planner-edital-erro" className="campo__erro" role="alert">{erros.editalId}</p>}
          {trocaDeEdital && <Aviso tipo="atencao">
            Ao salvar, este edital passa a ser o seu curso ativo. Progresso, questões e desempenho passam a considerar o novo edital, e o cronograma atual fica desatualizado.
          </Aviso>}
        </fieldset>

        <fieldset className="planner-etapa">
          <legend><span className="planner-etapa__numero" aria-hidden="true">2</span>Meta semanal</legend>
          <CampoFormulario
            id="planner-meta"
            rotulo="Meta semanal (horas)"
            erro={erros.metaHorasSemanais}
            ajuda={metaValida(meta)
              ? `Cerca de ${formatarTempo(Math.round((Number(meta) * 60) / 7))} por dia, estudando todos os dias. Ajustar este plano não altera o perfil.`
              : 'Começa com a meta do seu perfil. Ajustar este plano não altera o perfil.'}
          >
            <input type="number" min={1} max={168} step={1} inputMode="numeric" value={meta} onChange={evento => { setMeta(evento.target.value); setSalvoAgora(null) }} />
          </CampoFormulario>
        </fieldset>

        {edital && <fieldset className="planner-etapa">
          <legend><span className="planner-etapa__numero" aria-hidden="true">3</span>Prioridades por disciplina</legend>
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
                    <input type="radio" name={`prioridade-${d.id}`} value={opcao} checked={prioridadeDe(d.id) === opcao} onChange={() => { setPrioridades(atual => ({ ...atual, [d.id]: opcao })); setSalvoAgora(null) }} />
                    <span>{ROTULOS[opcao]}</span>
                  </label>)}
                </span>
                <span className="planner-prioridade__previa">{previa[d.id] !== undefined ? formatarTempo(previa[d.id]) : '—'}</span>
              </fieldset>
            </li>)}
          </ul>
        </fieldset>}

        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <div className="planner-salvar">
          {plano && alterado && !salvando && <p className="planner-pendente" role="status">Você tem alterações não salvas.</p>}
          <Botao type="submit" carregando={salvando} disabled={Boolean(plano) && !alterado}>{textoDoBotao}</Botao>
        </div>
      </fieldset>
    </form>
    {salvoAgora && <Aviso tipo="sucesso">
      Plano semanal gerado e salvo. <Link to="/cronograma">{salvoAgora.trocouEdital ? 'Gere o cronograma do novo edital' : 'Atualize o cronograma'}</Link> para distribuir as atividades da semana.
    </Aviso>}
  </section>
}

export default function TelaPlanner({ token, onEncerrarSessao }: Props) {
  const carregar = useCallback(async (): Promise<DadosDoPlanner> => {
    const [editais, perfil, plano] = await Promise.all([
      listarEditaisAprovados(token),
      // A meta do perfil so sugere um valor inicial: sem ela o planner segue.
      buscarPerfil(token).catch((falha: unknown) => {
        if (falha instanceof SessaoEncerrada) throw falha
        return null
      }),
      buscarPlano(token),
    ])
    return { editais, metaDoPerfil: perfil?.metaEstudoSemanal ?? null, plano }
  }, [token])
  const { dados, definirDados, carregando, erro, recarregar } = useRecurso(carregar, onEncerrarSessao, 'Não foi possível carregar o planner. Tente novamente.')
  const plano = dados?.plano ?? null

  return <main className="tela tela-pagina">
    <CabecalhoDaPagina
      sobretitulo="ESTUDAR"
      titulo="Planner de estudos"
      descricao="Escolha o edital, defina sua meta semanal e distribua o tempo entre as disciplinas."
      acoes={plano && <>
        <Link className="botao-link" to={`/curso/${plano.edital.id}`}>Ir para o curso</Link>
        <Link className="botao-link botao-link--secundario" to="/cronograma">Ver cronograma</Link>
      </>}
    />
    {carregando && <EstadoCarregando>Carregando planner...</EstadoCarregando>}
    {erro && <><Aviso tipo="erro">{erro}</Aviso><Botao type="button" variante="secundario" onClick={recarregar}>Tentar novamente</Botao></>}
    {dados && !dados.editais.length && <EstadoSemDados titulo="Nenhum edital disponível">
      Nenhum edital aprovado disponível. Aguarde a publicação de um edital.
    </EstadoSemDados>}
    {dados && dados.editais.length > 0 && <div className="planner-layout">
      {plano
        ? <ResumoDoPlano plano={plano} />
        : <EstadoSemDados titulo="Você ainda não tem um plano">Crie seu plano abaixo: ele define o curso ativo, o progresso e o cronograma.</EstadoSemDados>}
      <FormularioDoPlano
        {...dados}
        token={token}
        onEncerrarSessao={onEncerrarSessao}
        onSalvo={novo => definirDados({ ...dados, plano: novo })}
      />
    </div>}
  </main>
}
