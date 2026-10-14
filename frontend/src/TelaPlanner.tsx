import { useEffect, useState } from 'react'
import { listarEditaisAprovados, type EditalAprovado } from './editais'
import { buscarPerfil } from './perfil'
import { buscarPlano, gerarPlano, formatarTempo, type Plano, type Prioridade } from './planner'
import { ErroDeApi, SessaoEncerrada } from './sessao'
import Aviso from './componentes/Aviso'
import Botao from './componentes/Botao'
import CampoFormulario from './componentes/CampoFormulario'
import Cartao from './componentes/Cartao'
import EstadoCarregando from './componentes/EstadoCarregando'
import EstadoVazio from './componentes/EstadoVazio'
import Tabela from './componentes/Tabela'

type Props = { token: string; onEncerrarSessao: (motivo?: string) => void; onVoltar: () => void; onIrParaCronograma?: () => void }
const ROTULOS: Record<Prioridade, string> = { BAIXA: 'Baixa', NORMAL: 'Normal', ALTA: 'Alta' }

export default function TelaPlanner({ token, onEncerrarSessao, onVoltar, onIrParaCronograma }: Props) {
  const [editais, setEditais] = useState<EditalAprovado[]>([])
  const [editalId, setEditalId] = useState('')
  const [meta, setMeta] = useState('')
  const [prioridades, setPrioridades] = useState<Record<number, Prioridade>>({})
  const [plano, setPlano] = useState<Plano | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erroDeCarga, setErroDeCarga] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [aviso, setAviso] = useState<string | null>(null)
  const [tentativa, setTentativa] = useState(0)
  const edital = editais.find(e => e.id === Number(editalId))

  useEffect(() => {
    let descartado = false
    Promise.all([listarEditaisAprovados(token), buscarPerfil(token), buscarPlano(token)])
      .then(([catalogo, perfil, salvo]) => {
        if (descartado) return
        setEditais(catalogo)
        setPlano(salvo)
        setMeta(String(salvo?.metaHorasSemanais ?? perfil.metaEstudoSemanal ?? ''))
        setEditalId(salvo ? String(salvo.edital.id) : catalogo.length === 1 ? String(catalogo[0].id) : '')
        setPrioridades(Object.fromEntries(salvo?.disciplinas.map(d => [d.disciplinaId, d.prioridade]) ?? []))
      })
      .catch((falha: unknown) => {
        if (descartado) return
        if (falha instanceof SessaoEncerrada) onEncerrarSessao('Sua sessão expirou. Faça login novamente.')
        else setErroDeCarga('Não foi possível carregar o planner. Tente novamente.')
      })
      .finally(() => { if (!descartado) setCarregando(false) })
    return () => { descartado = true }
  }, [token, onEncerrarSessao, tentativa])

  async function salvar() {
    const novosErros: Record<string, string> = {}
    if (!edital) novosErros.editalId = 'Selecione um edital aprovado.'
    if (!meta.trim() || !Number.isInteger(Number(meta)) || Number(meta) < 1 || Number(meta) > 168)
      novosErros.metaHorasSemanais = 'Informe uma meta inteira de 1 a 168 horas por semana.'
    setErros(novosErros)
    setErro(null)
    setAviso(null)
    if (Object.keys(novosErros).length || !edital) return
    setSalvando(true)
    try {
      const gerado = await gerarPlano(token, {
        editalId: edital.id, metaHorasSemanais: Number(meta),
        prioridades: edital.disciplinas.map(d => ({ disciplinaId: d.id, prioridade: prioridades[d.id] ?? 'NORMAL' })),
      })
      setPlano(gerado)
      setAviso('Plano semanal gerado e salvo.')
    } catch (falha: unknown) {
      if (falha instanceof SessaoEncerrada) onEncerrarSessao('Sua sessão expirou. Faça login novamente.')
      else if (falha instanceof ErroDeApi) {
        setErros(Object.fromEntries(falha.erros.map(e => [e.campo, e.mensagem])))
        setErro(falha.message)
      } else setErro('Não foi possível salvar o plano. Tente novamente.')
    } finally { setSalvando(false) }
  }

  return <main className="tela">
    <Cartao largo titulo="Planner de estudos" descricao="Organize sua meta semanal conforme as prioridades das disciplinas.">
      {carregando && <EstadoCarregando>Carregando planner...</EstadoCarregando>}
      {erroDeCarga && <><Aviso tipo="erro">{erroDeCarga}</Aviso><Botao type="button" variante="secundario" onClick={() => { setCarregando(true); setErroDeCarga(null); setTentativa(t => t + 1) }}>Tentar novamente</Botao></>}
      {!carregando && !erroDeCarga && editais.length === 0 && <EstadoVazio>Nenhum edital aprovado disponível. Aguarde a publicação de um edital.</EstadoVazio>}
      {!carregando && !erroDeCarga && editais.length > 0 && <>
        {!plano && <EstadoVazio>Você ainda não tem um plano semanal salvo.</EstadoVazio>}
        <form className="formulario" onSubmit={e => { e.preventDefault(); void salvar() }} noValidate>
          <fieldset className="planner-campos" disabled={salvando}>
            <legend className="visualmente-oculto">Configuração do plano semanal</legend>
            <CampoFormulario id="planner-edital" rotulo="Edital" erro={erros.editalId}>
              <select value={editalId} onChange={e => { setEditalId(e.target.value); setPrioridades({}); setErros({}); setAviso(null) }}>
                <option value="">Selecione um edital</option>
                {editais.map(e => <option key={e.id} value={e.id}>{e.titulo} — {e.ano}</option>)}
              </select>
            </CampoFormulario>
            <CampoFormulario id="planner-meta" rotulo="Meta semanal (horas)" erro={erros.metaHorasSemanais} ajuda="Começa com a meta do seu perfil. Ajustar este plano não altera o perfil.">
              <input type="number" min={1} max={168} step={1} value={meta} onChange={e => setMeta(e.target.value)} />
            </CampoFormulario>
            {edital && <section aria-labelledby="titulo-prioridades">
              <h2 id="titulo-prioridades">Prioridades por disciplina</h2>
              <p>Baixa, normal e alta recebem pesos 1, 2 e 3. Uma prioridade maior recebe mais tempo da mesma meta semanal.</p>
              <div className="planner-prioridades">{edital.disciplinas.map(d => <CampoFormulario key={d.id} id={`prioridade-${d.id}`} rotulo={`Prioridade — ${d.nome}`}>
                <select value={prioridades[d.id] ?? 'NORMAL'} onChange={e => setPrioridades(p => ({ ...p, [d.id]: e.target.value as Prioridade }))}>
                  {Object.entries(ROTULOS).map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
                </select>
              </CampoFormulario>)}</div>
            </section>}
            {erro && <Aviso tipo="erro">{erro}</Aviso>}
            <Botao type="submit" carregando={salvando}>{salvando ? 'Gerando e salvando...' : 'Gerar e salvar plano'}</Botao>
          </fieldset>
        </form>
        {aviso && <Aviso tipo="sucesso">{aviso}</Aviso>}
      </>}
      {plano && <section className="revisao" aria-labelledby="titulo-plano-salvo">
        <h2 id="titulo-plano-salvo">Plano semanal salvo</h2>
        <p>{plano.edital.titulo} — {plano.edital.ano}</p>
        <p>Meta: <strong>{plano.metaHorasSemanais}h por semana</strong>. Total distribuído: <strong>{formatarTempo(plano.disciplinas.reduce((s, d) => s + d.minutosSemanais, 0))}</strong>.</p>
        <Tabela><thead><tr><th scope="col">Disciplina</th><th scope="col">Prioridade</th><th scope="col">Tempo semanal</th></tr></thead>
          <tbody>{plano.disciplinas.map(d => <tr key={d.disciplinaId}><td>{d.nome}</td><td>{ROTULOS[d.prioridade]}</td><td>{formatarTempo(d.minutosSemanais)}</td></tr>)}</tbody>
        </Tabela>
        <h3>Conteúdos do edital</h3>
        {plano.edital.disciplinas.map(d => <details key={d.id} className="planner-conteudos"><summary>{d.nome} (pág. {d.pagina})</summary>
          <ul>{d.assuntos.map(a => <li key={a.id}>{a.nome} (pág. {a.pagina})<ul>{a.subassuntos.map(s => <li key={s.id}>{s.nome} (pág. {s.pagina})</li>)}</ul></li>)}</ul>
          {!d.assuntos.length && <p>Nenhum conteúdo detalhado para esta disciplina.</p>}
        </details>)}
      </section>}
      <div className="acoes acoes--em-linha">
        {plano && onIrParaCronograma && <Botao type="button" onClick={onIrParaCronograma} disabled={salvando}>Criar cronograma</Botao>}
        <Botao type="button" variante="secundario" onClick={onVoltar} disabled={salvando}>Voltar</Botao>
      </div>
    </Cartao>
  </main>
}
