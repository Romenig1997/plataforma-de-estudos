import { useEffect, useState } from 'react'
import { listarInscricoes, type Inscricao } from './cursos'
import { buscarCronograma, gerarCronograma, minutosHorario, minutosDisponiveis, inicioSemana, hojeLocal, somarDias, diaEMes, type Atividade, type Cronograma, type LinhaDeHorario } from './cronograma'
import { ErroDeApi, SessaoEncerrada } from './sessao'
import { salvarRegistro } from './dashboard'
import { mensagemDaFalha } from './api'
import Aviso from './componentes/Aviso'
import Botao from './componentes/Botao'
import EstadoCarregando from './componentes/EstadoCarregando'
import { CabecalhoDaPagina, EstadoSemDados } from './componentes/Pagina'
import AgendaDaSemana from './componentes/AgendaDaSemana'
import EditorDeDisponibilidade from './componentes/EditorDeDisponibilidade'

type Props = { token: string; onEncerrarSessao: (motivo?: string) => void; onIrParaPlanner: () => void }

export default function TelaCronograma({ token, onEncerrarSessao, onIrParaPlanner }: Props) {
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([])
  const [cronograma, setCronograma] = useState<Cronograma | null>(null)
  const [semana, setSemana] = useState(inicioSemana)
  const [linhas, setLinhas] = useState<LinhaDeHorario[]>([])
  const [editando, setEditando] = useState(false)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [erro, setErro] = useState<string | null>(null)
  const [erroCarga, setErroCarga] = useState<string | null>(null)
  const [erroDaAgenda, setErroDaAgenda] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [tentativa, setTentativa] = useState(0)
  const [salvandoConteudo, setSalvandoConteudo] = useState<number | null>(null)
  // Agenda combinada: os horarios precisam comportar a meta de todos os cursos inscritos.
  const metaTotal = inscricoes.reduce((soma, i) => soma + i.metaHorasSemanais, 0)
  const temCursos = inscricoes.length > 0
  const tituloDoCurso = new Map((cronograma?.cursos ?? []).map(c => [c.editalId, c.titulo]))
  const variosCursos = tituloDoCurso.size > 1
  // Sem agenda salva o formulario e o unico conteudo util: fica sempre aberto.
  const mostrarEditor = temCursos && (!cronograma || editando)

  useEffect(() => {
    let descartado = false
    Promise.all([listarInscricoes(token), buscarCronograma(token)])
      .then(([cursos, salvo]) => {
        if (descartado) return
        setInscricoes(cursos); setCronograma(salvo)
        if (salvo) {
          setSemana(salvo.semanaInicio)
          setLinhas(salvo.disponibilidades.map((d, i) => ({ ...d, inicio: d.inicio.slice(0, 5), fim: d.fim.slice(0, 5), chave: i + 1 })))
        }
      })
      .catch((falha: unknown) => {
        if (descartado) return
        if (falha instanceof SessaoEncerrada) onEncerrarSessao('Sua sessão expirou. Faça login novamente.')
        else setErroCarga('Não foi possível carregar o cronograma. Tente novamente.')
      })
      .finally(() => { if (!descartado) setCarregando(false) })
    return () => { descartado = true }
  }, [token, onEncerrarSessao, tentativa])

  function alterarLinhas(atualizar: (linhas: LinhaDeHorario[]) => LinhaDeHorario[]) {
    setLinhas(atualizar); setErros({}); setErro(null); setAviso(null)
  }

  async function salvar() {
    setErro(null); setAviso(null)
    const invalidos: Record<string, string> = {}
    if (!/^\d{4}-\d{2}-\d{2}$/.test(semana) || new Date(`${semana}T12:00:00`).getDay() !== 1)
      invalidos.semanaInicio = 'Escolha uma segunda-feira para iniciar a semana.'
    if (!linhas.length) invalidos.disponibilidades = 'Adicione pelo menos um horário disponível.'
    linhas.forEach(l => {
      if (!Number.isFinite(minutosHorario(l.inicio))) invalidos[`inicio-${l.chave}`] = 'Informe o horário inicial.'
      if (!Number.isFinite(minutosHorario(l.fim)) || minutosHorario(l.fim) <= minutosHorario(l.inicio))
        invalidos[`fim-${l.chave}`] = 'Informe um horário final posterior ao início, no mesmo dia.'
    })
    const ordenados = [...linhas].sort((a, b) => a.diaSemana - b.diaSemana || a.inicio.localeCompare(b.inicio))
    if (ordenados.some((l, i) => i > 0 && l.diaSemana === ordenados[i - 1].diaSemana && l.inicio < ordenados[i - 1].fim))
      invalidos.disponibilidades = 'Os horários disponíveis não podem se sobrepor no mesmo dia.'
    if (temCursos && minutosDisponiveis(linhas) < metaTotal * 60)
      invalidos.disponibilidades ??= 'Sua disponibilidade não comporta a meta semanal. Ajuste os horários ou a meta do planner.'
    setErros(invalidos)
    if (Object.keys(invalidos).length || !temCursos) return
    setSalvando(true)
    try {
      const salvo = await gerarCronograma(token, { semanaInicio: semana, disponibilidades: linhas.map(({ diaSemana, inicio, fim }) => ({ diaSemana, inicio, fim })) })
      setCronograma(salvo)
      setEditando(false)
      setAviso('Cronograma gerado e salvo.')
    } catch (falha: unknown) {
      if (falha instanceof SessaoEncerrada) onEncerrarSessao('Sua sessão expirou. Faça login novamente.')
      else if (falha instanceof ErroDeApi) {
        setErro(falha.message)
        setErros(Object.fromEntries(falha.erros.map(e => [e.campo, e.mensagem])))
      } else setErro('Não foi possível salvar o cronograma. Tente novamente.')
    } finally { setSalvando(false) }
  }

  /** Conclui o topico da sessao (vale para todas as sessoes dele) e desfaz se o servidor recusar. */
  async function concluir(atividade: Atividade, concluido: boolean) {
    const marcar = (valor: boolean) => setCronograma(atual => atual && { ...atual, atividades: atual.atividades.map(a => (a.conteudoId === atividade.conteudoId ? { ...a, concluido: valor } : a)) })
    setErroDaAgenda(null); setAviso(null); setSalvandoConteudo(atividade.conteudoId); marcar(concluido)
    try {
      await salvarRegistro(token, atividade.conteudoId, { concluido })
    } catch (falha: unknown) {
      marcar(!concluido)
      const mensagem = mensagemDaFalha(falha, onEncerrarSessao, 'Não foi possível salvar a conclusão. Tente novamente.')
      if (mensagem) setErroDaAgenda(mensagem)
    } finally { setSalvandoConteudo(null) }
  }

  const feitas = cronograma?.atividades.filter(a => a.concluido).length ?? 0
  const resumo = cronograma
    ? `Semana de ${diaEMes(cronograma.semanaInicio)} a ${diaEMes(somarDias(cronograma.semanaInicio, 6))} · ${cronograma.metaHorasSemanais}h planejadas · ${feitas} de ${cronograma.atividades.length} sessões feitas${variosCursos ? ` · ${inscricoes.map(i => `${i.titulo} (${i.metaHorasSemanais}h)`).join(' + ')}` : ''}`
    : 'Informe seus horários livres e a plataforma distribui os conteúdos dos seus cursos na semana.'

  return <main className="tela tela-pagina">
    <CabecalhoDaPagina
      sobretitulo="PLANEJAR"
      titulo="Cronograma"
      descricao={temCursos ? resumo : undefined}
      acoes={<>
        {cronograma && temCursos && <button type="button" className="botao-link" aria-expanded={editando} aria-controls="painel-horarios" disabled={salvando}
          onClick={() => { setEditando(v => !v); setAviso(null) }}>{editando ? 'Fechar ajustes' : 'Ajustar horários'}</button>}
        <button type="button" className="botao-link botao-link--secundario" disabled={salvando} onClick={onIrParaPlanner}>Editar plano semanal</button>
      </>}
    />
    {carregando && <EstadoCarregando>Carregando cronograma...</EstadoCarregando>}
    {erroCarga && <><Aviso tipo="erro">{erroCarga}</Aviso><Botao type="button" onClick={() => { setCarregando(true); setErroCarga(null); setTentativa(t => t + 1) }}>Tentar novamente</Botao></>}
    {!carregando && !erroCarga && !temCursos && <EstadoSemDados titulo="Nenhum curso no cronograma" acao={{ texto: 'Explorar cursos', para: '/app' }}>
      Inscreva-se em um curso e salve o plano dele para criar seu cronograma.
    </EstadoSemDados>}

    {aviso && <Aviso tipo="sucesso">{aviso}</Aviso>}
    {cronograma?.desatualizado && <Aviso tipo="atencao">Seus planos mudaram ou você entrou em um novo curso depois desta agenda. Gere o cronograma novamente para incluir as mudanças.</Aviso>}

    {!carregando && mostrarEditor && <section id="painel-horarios" className="painel" aria-labelledby="titulo-horarios">
      <h2 id="titulo-horarios">Seus horários de estudo</h2>
      <EditorDeDisponibilidade
        semana={semana}
        linhas={linhas}
        metaEmMinutos={metaTotal * 60}
        erros={erros}
        erro={erro}
        salvando={salvando}
        onSemana={valor => { setSemana(valor); setAviso(null) }}
        onLinhas={alterarLinhas}
        onSalvar={() => void salvar()}
      />
    </section>}

    {erroDaAgenda && <Aviso tipo="erro">{erroDaAgenda}</Aviso>}
    {!carregando && cronograma && <AgendaDaSemana
      semanaInicio={cronograma.semanaInicio}
      atividades={cronograma.atividades}
      hoje={hojeLocal()}
      onConcluir={(atividade, valor) => void concluir(atividade, valor)}
      salvandoConteudo={salvandoConteudo}
      cursoDe={variosCursos ? a => (a.editalId === undefined ? undefined : tituloDoCurso.get(a.editalId)) : undefined}
    />}
  </main>
}
