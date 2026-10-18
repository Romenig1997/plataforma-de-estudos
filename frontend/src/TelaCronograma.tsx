import { useCallback, useEffect, useState } from 'react'
import { listarInscricoes, type Inscricao } from './cursos'
import { buscarCronograma, gerarCronograma, avisoDeHorasAcimaDaMeta, janelasDosHorarios, minutosHorario, minutosDisponiveis, inicioSemana, hojeLocal, somarDias, diaEMes, type Atividade, type Cronograma, type Disponibilidade, type LinhaDeHorario } from './cronograma'
import { ErroDeApi, SessaoEncerrada } from './sessao'
import { salvarRegistro } from './dashboard'
import { mensagemDaFalha } from './api'
import Aviso from './componentes/Aviso'
import Botao from './componentes/Botao'
import Notificacao, { type DadosDaNotificacao } from './componentes/Notificacao'
import EstadoCarregando from './componentes/EstadoCarregando'
import { CabecalhoDaPagina, Conteudo, EstadoSemDados } from './componentes/Pagina'
import { ArrowLeftIcon, CalendarClockIcon, Clock3Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import AgendaDaSemana from './componentes/AgendaDaSemana'
import EditorDeDisponibilidade from './componentes/EditorDeDisponibilidade'
import MarcacoesDaSemana from './componentes/MarcacoesDaSemana'

const linhasSalvas = (salvo: Cronograma): LinhaDeHorario[] =>
  salvo.disponibilidades.map((d, i) => ({ ...d, inicio: d.inicio.slice(0, 5), fim: d.fim.slice(0, 5), chave: i + 1 }))

type Props = { token: string; onEncerrarSessao: (motivo?: string) => void; onIrParaPlanner: () => void }

export default function TelaCronograma({ token, onEncerrarSessao, onIrParaPlanner }: Props) {
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([])
  const [cronograma, setCronograma] = useState<Cronograma | null>(null)
  const [linhas, setLinhas] = useState<LinhaDeHorario[]>([])
  const [editando, setEditando] = useState(false)
  // Grade detalhada, aberta pelo link "Ajustar manualmente" das Marcacoes.
  const [manual, setManual] = useState(false)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [erroCarga, setErroCarga] = useState<string | null>(null)
  // Salvo ou erro ao salvar aparecem num pop-up; erros de campo continuam junto do campo.
  const [notificacao, setNotificacao] = useState<DadosDaNotificacao | null>(null)
  const fecharNotificacao = useCallback(() => setNotificacao(null), [])
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
  // Dias com mais de um horario so cabem na grade manual.
  const janelas = janelasDosHorarios(linhas)
  const mostrarManual = manual || janelas === null

  useEffect(() => {
    let descartado = false
    Promise.all([listarInscricoes(token), buscarCronograma(token)])
      .then(([cursos, salvo]) => {
        if (descartado) return
        setInscricoes(cursos); setCronograma(salvo)
        if (salvo) {
          setLinhas(linhasSalvas(salvo))
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

  /** Fecha os ajustes descartando o que nao foi salvo. */
  function fecharAjustes() {
    setEditando(false); setManual(false); setErros({})
    if (cronograma) setLinhas(linhasSalvas(cronograma))
  }

  function alterarLinhas(atualizar: (linhas: LinhaDeHorario[]) => LinhaDeHorario[]) {
    setLinhas(atualizar); setErros({})
  }

  const comChave = (horarios: Disponibilidade[]): LinhaDeHorario[] => horarios.map((h, i) => ({ ...h, chave: i + 1 }))

  async function salvar(linhas: LinhaDeHorario[]) {
    setNotificacao(null)
    const invalidos: Record<string, string> = {}
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
    if (invalidos.disponibilidades) setNotificacao({ tipo: 'erro', mensagem: invalidos.disponibilidades })
    else if (Object.keys(invalidos).length) setNotificacao({ tipo: 'erro', mensagem: 'Revise os horários destacados antes de salvar.' })
    if (Object.keys(invalidos).length || !temCursos) return
    setSalvando(true)
    try {
      const salvo = await gerarCronograma(token, { semanaInicio: inicioSemana(), disponibilidades: linhas.map(({ diaSemana, inicio, fim }) => ({ diaSemana, inicio, fim })) })
      setCronograma(salvo)
      setEditando(false)
      setManual(false)
      setNotificacao({ tipo: 'sucesso', mensagem: 'Cronograma gerado e salvo.' })
    } catch (falha: unknown) {
      if (falha instanceof SessaoEncerrada) onEncerrarSessao('Sua sessão expirou. Faça login novamente.')
      else if (falha instanceof ErroDeApi) {
        setNotificacao({ tipo: 'erro', mensagem: falha.message })
        setErros(Object.fromEntries(falha.erros.map(e => [e.campo, e.mensagem])))
      } else setNotificacao({ tipo: 'erro', mensagem: 'Não foi possível salvar o cronograma. Tente novamente.' })
    } finally { setSalvando(false) }
  }

  /** Conclui o topico da sessao (vale para todas as sessoes dele) e desfaz se o servidor recusar. */
  async function concluir(atividade: Atividade, concluido: boolean) {
    const marcar = (valor: boolean) => setCronograma(atual => atual && { ...atual, atividades: atual.atividades.map(a => (a.conteudoId === atividade.conteudoId ? { ...a, concluido: valor } : a)) })
    setNotificacao(null); setSalvandoConteudo(atividade.conteudoId); marcar(concluido)
    try {
      await salvarRegistro(token, atividade.conteudoId, { concluido })
    } catch (falha: unknown) {
      marcar(!concluido)
      const mensagem = mensagemDaFalha(falha, onEncerrarSessao, 'Não foi possível salvar a conclusão. Tente novamente.')
      if (mensagem) setNotificacao({ tipo: 'erro', mensagem })
    } finally { setSalvandoConteudo(null) }
  }

  const feitas = cronograma?.atividades.filter(a => a.concluido).length ?? 0
  // Com o editor fechado, o aviso de excesso usa os horarios salvos; aberto, o editor mostra o seu.
  const excessoSalvo = cronograma && !editando ? avisoDeHorasAcimaDaMeta(minutosDisponiveis(cronograma.disponibilidades), metaTotal * 60) : null
  const resumo = cronograma
    ? `Semana de ${diaEMes(cronograma.semanaInicio)} a ${diaEMes(somarDias(cronograma.semanaInicio, 6))} · ${cronograma.metaHorasSemanais}h planejadas · ${feitas} de ${cronograma.atividades.length} sessões feitas${variosCursos ? ` · ${inscricoes.map(i => `${i.titulo} (${i.metaHorasSemanais}h)`).join(' + ')}` : ''}`
    : 'Informe seus horários livres e a plataforma distribui os conteúdos dos seus cursos na semana.'

  return <Conteudo>
    <CabecalhoDaPagina
      sobretitulo="PLANEJAR"
      titulo="Cronograma"
      descricao={temCursos ? resumo : undefined}
      acoes={<>
        {cronograma && temCursos && <Button type="button" aria-expanded={editando} aria-controls="painel-horarios" disabled={salvando}
          onClick={() => (editando ? fecharAjustes() : setEditando(true))}>{editando ? 'Fechar ajustes' : <><Clock3Icon aria-hidden="true" />Ajustar horários</>}</Button>}
        <Button type="button" variant="outline" disabled={salvando} onClick={onIrParaPlanner}>Editar plano semanal</Button>
      </>}
    />
    {carregando && <EstadoCarregando formato="pagina">Carregando cronograma...</EstadoCarregando>}
    {erroCarga && <div className="flex flex-col items-start gap-3"><Aviso tipo="erro">{erroCarga}</Aviso><Botao type="button" onClick={() => { setCarregando(true); setErroCarga(null); setTentativa(t => t + 1) }}>Tentar novamente</Botao></div>}
    {!carregando && !erroCarga && !temCursos && <EstadoSemDados titulo="Nenhum curso no cronograma" icone={<CalendarClockIcon />} acao={{ texto: 'Explorar cursos', para: '/app' }}>
      Inscreva-se em um curso e salve o plano dele para criar seu cronograma.
    </EstadoSemDados>}

    {excessoSalvo && <Aviso tipo="atencao">{excessoSalvo}</Aviso>}
    {cronograma?.desatualizado && <Aviso tipo="atencao">Seus planos mudaram ou você entrou em um novo curso depois desta agenda. Gere o cronograma novamente para incluir as mudanças.</Aviso>}

    {!carregando && mostrarEditor && !mostrarManual && <div id="painel-horarios">
      <MarcacoesDaSemana
        janelas={janelas ?? []}
        metaEmMinutos={metaTotal * 60}
        salvando={salvando}
        onSalvar={horarios => { const novas = comChave(horarios); setLinhas(novas); void salvar(novas) }}
        onAjustarManualmente={horarios => { setLinhas(comChave(horarios)); setErros({}); setManual(true) }}
        onCancelar={cronograma ? fecharAjustes : undefined}
      />
    </div>}
    {!carregando && mostrarEditor && mostrarManual && <Card id="painel-horarios" className="gap-4" role="region" aria-labelledby="titulo-horarios">
      <CardHeader>
        <CardTitle><h2 id="titulo-horarios" className="text-lg font-semibold">Seus horários de estudo</h2></CardTitle>
        {janelas && <CardAction><Button type="button" variant="link" size="sm" onClick={() => setManual(false)}><ArrowLeftIcon aria-hidden="true" />Voltar para as marcações</Button></CardAction>}
      </CardHeader>
      <CardContent>
        <EditorDeDisponibilidade
          linhas={linhas}
          metaEmMinutos={metaTotal * 60}
          erros={erros}
          salvando={salvando}
          onLinhas={alterarLinhas}
          onSalvar={() => void salvar(linhas)}
        />
      </CardContent>
    </Card>}

    {!carregando && cronograma && <AgendaDaSemana
      semanaInicio={cronograma.semanaInicio}
      atividades={cronograma.atividades}
      hoje={hojeLocal()}
      onConcluir={(atividade, valor) => void concluir(atividade, valor)}
      salvandoConteudo={salvandoConteudo}
      cursoDe={variosCursos ? a => (a.editalId === undefined ? undefined : tituloDoCurso.get(a.editalId)) : undefined}
    />}
    {notificacao && <Notificacao {...notificacao} onFechar={fecharNotificacao} />}
  </Conteudo>
}
