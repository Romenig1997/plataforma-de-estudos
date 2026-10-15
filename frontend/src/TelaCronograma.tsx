import { useEffect, useState } from 'react'
import { formatarTempo } from './planner'
import { listarInscricoes, type Inscricao } from './cursos'
import { buscarCronograma, gerarCronograma, DIAS, minutosHorario, inicioSemana, dataLegivel, type Cronograma, type Disponibilidade } from './cronograma'
import { ErroDeApi, SessaoEncerrada } from './sessao'
import Aviso from './componentes/Aviso'
import Botao from './componentes/Botao'
import CampoFormulario from './componentes/CampoFormulario'
import Cartao from './componentes/Cartao'
import EstadoCarregando from './componentes/EstadoCarregando'
import EstadoVazio from './componentes/EstadoVazio'

type Props = { token: string; onEncerrarSessao: (motivo?: string) => void; onVoltar: () => void; onIrParaPlanner: () => void }
type Linha = Disponibilidade & { chave: number }

export default function TelaCronograma({ token, onEncerrarSessao, onVoltar, onIrParaPlanner }: Props) {
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([])
  const [cronograma, setCronograma] = useState<Cronograma | null>(null)
  const [semana, setSemana] = useState(inicioSemana)
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [erros, setErros] = useState<Record<string, string>>({})
  const [erro, setErro] = useState<string | null>(null)
  const [erroCarga, setErroCarga] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [tentativa, setTentativa] = useState(0)
  const disponibilidade = linhas.reduce((s, l) => {
    const duracao = minutosHorario(l.fim) - minutosHorario(l.inicio)
    return s + (Number.isFinite(duracao) && duracao > 0 ? duracao : 0)
  }, 0)
  // Agenda combinada: os horarios precisam comportar a meta de todos os cursos inscritos.
  const metaTotal = inscricoes.reduce((soma, i) => soma + i.metaHorasSemanais, 0)
  const temCursos = inscricoes.length > 0
  const insuficiente = temCursos && disponibilidade < metaTotal * 60
  const tituloDoCurso = new Map((cronograma?.cursos ?? []).map(c => [c.editalId, c.titulo]))
  const variosCursos = tituloDoCurso.size > 1

  useEffect(() => {
    let descartado = false
    Promise.all([listarInscricoes(token), buscarCronograma(token)])
      .then(([cursos, salvo]) => {
        if (descartado) return
        setInscricoes(cursos); setCronograma(salvo)
        if (salvo) {
          setSemana(salvo.semanaInicio)
          setLinhas(salvo.disponibilidades.map((d, i) => ({ ...d, inicio: d.inicio.slice(0,5), fim: d.fim.slice(0,5), chave: i + 1 })))
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

  function editar(chave: number, campo: keyof Disponibilidade, valor: string | number) {
    setLinhas(ls => ls.map(l => l.chave === chave ? { ...l, [campo]: valor } : l))
    setErros({}); setErro(null); setAviso(null)
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
    const ordenados = [...linhas].sort((a,b) => a.diaSemana - b.diaSemana || a.inicio.localeCompare(b.inicio))
    if (ordenados.some((l,i) => i > 0 && l.diaSemana === ordenados[i-1].diaSemana && l.inicio < ordenados[i-1].fim))
      invalidos.disponibilidades = 'Os horários disponíveis não podem se sobrepor no mesmo dia.'
    if (insuficiente) invalidos.disponibilidades ??= 'Sua disponibilidade não comporta a meta semanal. Ajuste os horários ou a meta do planner.'
    setErros(invalidos)
    if (Object.keys(invalidos).length || !temCursos) return
    setSalvando(true)
    try {
      const salvo = await gerarCronograma(token, { semanaInicio: semana, disponibilidades: linhas.map(({ diaSemana, inicio, fim }) => ({ diaSemana, inicio, fim })) })
      setCronograma(salvo)
      setAviso('Cronograma gerado e salvo.')
    } catch (falha: unknown) {
      if (falha instanceof SessaoEncerrada) onEncerrarSessao('Sua sessão expirou. Faça login novamente.')
      else if (falha instanceof ErroDeApi) {
        setErro(falha.message)
        setErros(Object.fromEntries(falha.erros.map(e => [e.campo, e.mensagem])))
      } else setErro('Não foi possível salvar o cronograma. Tente novamente.')
    } finally { setSalvando(false) }
  }
  const datas = [...new Set(cronograma?.atividades.map(a => a.data) ?? [])].sort()
  return <main className="tela">
    <Cartao largo titulo="Cronograma de estudos" descricao="Uma agenda única que distribui as atividades de todos os seus cursos nos dias e horários disponíveis.">
      {carregando && <EstadoCarregando>Carregando cronograma...</EstadoCarregando>}
      {erroCarga && <><Aviso tipo="erro">{erroCarga}</Aviso><Botao type="button" onClick={() => { setCarregando(true); setErroCarga(null); setTentativa(t => t+1) }}>Tentar novamente</Botao></>}
      {!carregando && !erroCarga && !temCursos && <EstadoVazio>Inscreva-se em um curso e salve o plano dele para criar seu cronograma.</EstadoVazio>}
      {!carregando && !erroCarga && temCursos && <>
        <p>Meta combinada: <strong>{metaTotal}h por semana</strong> — {inscricoes.map(i => `${i.titulo} (${i.metaHorasSemanais}h)`).join(' + ')}.</p>
        <p>Sessões de até 60 minutos, com conteúdos do edital e sem sobreposição. Horários no seu horário local.</p>
        <form onSubmit={e => { e.preventDefault(); void salvar() }} noValidate>
          <fieldset className="planner-campos" disabled={salvando}>
            <legend className="visualmente-oculto">Disponibilidade de estudo</legend>
            <CampoFormulario id="cronograma-semana" rotulo="Semana iniciando em" erro={erros.semanaInicio} ajuda="Selecione a segunda-feira da semana que deseja planejar.">
              <input type="date" value={semana} onChange={e => { setSemana(e.target.value); setAviso(null) }} />
            </CampoFormulario>
            <h2>Dias e horários disponíveis</h2>
            {linhas.map((l,i) => <fieldset className="cronograma-periodo" key={l.chave}>
              <legend>Horário {i+1}</legend>
              <CampoFormulario id={`dia-${l.chave}`} rotulo={`Dia da semana — horário ${i+1}`}><select value={l.diaSemana} onChange={e => editar(l.chave,'diaSemana',Number(e.target.value))}>
                {DIAS.map((d,indice) => <option key={d} value={indice+1}>{d}</option>)}
              </select></CampoFormulario>
              <div className="cronograma-horas">
                <CampoFormulario id={`inicio-${l.chave}`} rotulo={`Início — horário ${i+1}`} erro={erros[`inicio-${l.chave}`]}><input type="time" value={l.inicio} onChange={e => editar(l.chave,'inicio',e.target.value)} /></CampoFormulario>
                <CampoFormulario id={`fim-${l.chave}`} rotulo={`Fim — horário ${i+1}`} erro={erros[`fim-${l.chave}`]}><input type="time" value={l.fim} onChange={e => editar(l.chave,'fim',e.target.value)} /></CampoFormulario>
              </div>
              <Botao type="button" variante="secundario" onClick={() => { setLinhas(ls => ls.filter(x => x.chave !== l.chave)); setAviso(null) }}>Remover horário {i+1}</Botao>
            </fieldset>)}
            <Botao type="button" variante="secundario" onClick={() => setLinhas(ls => [...ls, { chave: Math.max(0,...ls.map(l => l.chave))+1, diaSemana: 1, inicio: '', fim: '' }])}>Adicionar horário</Botao>
            <p>Disponibilidade informada: <strong>{formatarTempo(disponibilidade)}</strong>. Meta: <strong>{metaTotal}h</strong>.</p>
            {insuficiente && <p className="campo__ajuda">Faltam {formatarTempo(metaTotal*60-disponibilidade)} para comportar a meta semanal.</p>}
            {erros.disponibilidades && <Aviso tipo="erro">{erros.disponibilidades}</Aviso>}
            {erro && <Aviso tipo="erro">{erro}</Aviso>}
            <Botao type="submit" carregando={salvando}>{salvando ? 'Gerando e salvando...' : 'Gerar e salvar cronograma'}</Botao>
          </fieldset>
        </form>
      </>}
      {aviso && <Aviso tipo="sucesso">{aviso}</Aviso>}
      {cronograma && <section className="revisao" aria-labelledby="titulo-cronograma-salvo">
        <h2 id="titulo-cronograma-salvo">Agenda semanal salva</h2>
        <p>{cronograma.editalTitulo}. Semana de {dataLegivel(cronograma.semanaInicio)}. Meta planejada: {cronograma.metaHorasSemanais}h.</p>
        {cronograma.desatualizado && <Aviso tipo="atencao">Seus planos mudaram ou você entrou em um novo curso depois desta agenda. Gere o cronograma novamente para incluir as mudanças.</Aviso>}
        {datas.map(data => <section key={data} aria-labelledby={`dia-agenda-${data}`}>
          <h3 id={`dia-agenda-${data}`}>{dataLegivel(data)}</h3>
          <ol className="cronograma-atividades">{cronograma.atividades.filter(a => a.data === data).map(a => <li key={a.id}>
            <p><strong>{a.inicio.slice(0,5)}–{a.fim.slice(0,5)} · {a.disciplina}</strong></p>
            {variosCursos && a.editalId !== undefined && <p className="cronograma-curso">{tituloDoCurso.get(a.editalId)}</p>}
            <p>{a.conteudo} <span>(pág. {a.pagina})</span></p>
          </li>)}</ol>
        </section>)}
      </section>}
      <div className="acoes acoes--em-linha">
        <Botao type="button" variante="secundario" onClick={onIrParaPlanner} disabled={salvando}>Editar plano semanal</Botao>
        <Botao type="button" variante="secundario" onClick={onVoltar} disabled={salvando}>Voltar</Botao>
      </div>
    </Cartao>
  </main>
}
