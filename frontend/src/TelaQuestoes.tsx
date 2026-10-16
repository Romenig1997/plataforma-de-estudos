import { useCallback, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { mensagemDaFalha } from './api'
import { buscarPlano, type Plano } from './planner'
import { listarQuestoes, responderQuestao, type QuestaoAluno } from './questoes'
import { ErroDeApi, SessaoEncerrada } from './sessao'
import { useRecurso } from './useRecurso'
import Aviso from './componentes/Aviso'
import Botao from './componentes/Botao'
import EstadoCarregando from './componentes/EstadoCarregando'
import { CabecalhoDaPagina, EstadoSemDados } from './componentes/Pagina'
import SeletorDeCurso from './componentes/SeletorDeCurso'
import { useCursoSelecionado } from './useCursoSelecionado'
import { embaralhar } from './embaralhar'

type Props = { token: string; onEncerrarSessao: (motivo?: string) => void }
/** `ordens[id]` guarda, por posicao na tela, o indice original de cada alternativa. */
type DadosDasQuestoes = { questoes: QuestaoAluno[]; plano: Plano | null; ordens: Record<number, number[]> }

const POR_PAGINA = 10
const INDICES = [0, 1, 2, 3]
const letra = (posicao: number) => String.fromCharCode(65 + posicao)

/** Nova ordem a cada visita: primeiro as nao respondidas, cada grupo embaralhado. */
function ordenarParaPraticar(questoes: QuestaoAluno[]): QuestaoAluno[] {
  return [...embaralhar(questoes.filter(q => !q.resposta)), ...embaralhar(questoes.filter(q => q.resposta))]
}

/** Disciplina de cada conteudo do edital, para filtrar o caderno. */
function disciplinaPorConteudo(plano: Plano | null): Map<number, number> {
  const mapa = new Map<number, number>()
  plano?.edital.disciplinas.forEach(disciplina => disciplina.assuntos.forEach(assunto => {
    mapa.set(assunto.id, disciplina.id)
    assunto.subassuntos.forEach(sub => mapa.set(sub.id, disciplina.id))
  }))
  return mapa
}

export default function TelaQuestoes({ token, onEncerrarSessao }: Props) {
  const [parametros, setParametros] = useSearchParams()
  const curso = useCursoSelecionado(token, onEncerrarSessao)
  const carregar = useCallback(async (): Promise<DadosDasQuestoes> => {
    const [questoes, plano] = await Promise.all([
      listarQuestoes(token, curso.editalId),
      // O plano so serve ao filtro: sem ele o caderno continua funcionando.
      buscarPlano(token, curso.editalId).catch((falha: unknown) => {
        if (falha instanceof SessaoEncerrada) throw falha
        return null
      }),
    ])
    const ordens: Record<number, number[]> = {}
    questoes.forEach(q => { ordens[q.id] = embaralhar(INDICES) })
    return { questoes: ordenarParaPraticar(questoes), plano, ordens }
  }, [token, curso.editalId])
  const { dados, definirDados, carregando, erro, recarregar } = useRecurso(carregar, onEncerrarSessao, 'Não foi possível carregar as questões. Tente novamente.')
  const [escolhas, setEscolhas] = useState<Record<number, number>>({})
  const [errosPorQuestao, setErrosPorQuestao] = useState<Record<number, string>>({})
  const [salvando, setSalvando] = useState<number | null>(null)
  const [refazendo, setRefazendo] = useState<Record<number, boolean>>({})

  const questoes = useMemo(() => dados?.questoes ?? [], [dados])
  const plano = dados?.plano ?? null
  const disciplinas = plano?.edital.disciplinas ?? []
  const mapa = useMemo(() => disciplinaPorConteudo(plano), [plano])
  const filtro = Number(parametros.get('disciplina')) || null
  const filtroValido = filtro !== null && disciplinas.some(d => d.id === filtro) ? filtro : null
  const visiveis = filtroValido ? questoes.filter(q => mapa.get(q.conteudoId) === filtroValido) : questoes
  const totalPaginas = Math.max(1, Math.ceil(visiveis.length / POR_PAGINA))
  const pagina = Math.min(totalPaginas, Math.max(1, Number(parametros.get('pagina')) || 1))
  const daPagina = visiveis.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)
  const respondidas = visiveis.filter(q => q.resposta).length
  const corretas = visiveis.filter(q => q.resposta?.correta).length

  function atualizarParametros(alteracoes: Record<string, string | null>) {
    const novos = new URLSearchParams(parametros)
    Object.entries(alteracoes).forEach(([chave, valor]) => (valor ? novos.set(chave, valor) : novos.delete(chave)))
    setParametros(novos)
  }

  async function responder(id: number) {
    if (escolhas[id] === undefined) {
      setErrosPorQuestao(atual => ({ ...atual, [id]: 'Selecione uma alternativa antes de responder.' }))
      return
    }
    setErrosPorQuestao(atual => ({ ...atual, [id]: '' }))
    setSalvando(id)
    try {
      const resposta = await responderQuestao(token, id, escolhas[id])
      definirDados(dados && { ...dados, questoes: dados.questoes.map(q => (q.id === id ? { ...q, resposta, tentativas: (q.tentativas ?? 0) + 1 } : q)) })
      setRefazendo(atual => ({ ...atual, [id]: false }))
    } catch (falha: unknown) {
      const mensagem = mensagemDaFalha(falha, onEncerrarSessao, 'Não foi possível registrar a resposta.')
      if (mensagem) setErrosPorQuestao(atual => ({ ...atual, [id]: mensagem }))
      // 409: a questao ja foi respondida em outra aba; recarrega o estado real.
      if (falha instanceof ErroDeApi && falha.status === 409) recarregar()
    } finally {
      setSalvando(null)
    }
  }

  /** Libera a questao para nova tentativa, com as alternativas em outra ordem. */
  function refazer(id: number) {
    setRefazendo(atual => ({ ...atual, [id]: true }))
    setEscolhas(atual => { const novas = { ...atual }; delete novas[id]; return novas })
    setErrosPorQuestao(atual => ({ ...atual, [id]: '' }))
    definirDados(dados && { ...dados, ordens: { ...dados.ordens, [id]: embaralhar(INDICES) } })
  }

  return <main className="tela tela-pagina">
    <CabecalhoDaPagina
      sobretitulo="PRATICAR"
      titulo="Questões do edital"
      descricao="Responda e acompanhe a correção automática das suas questões."
      acoes={<>
        <Link className="botao-link" to={plano ? `/dashboard?curso=${plano.edital.id}` : '/dashboard'}>Ver desempenho</Link>
        <button type="button" className="botao-link botao-link--secundario" disabled={carregando || salvando !== null} onClick={recarregar}>{erro ? 'Tentar novamente' : 'Atualizar questões'}</button>
      </>}
    />
    <SeletorDeCurso inscricoes={curso.inscricoes} editalAtual={plano?.edital.id ?? curso.editalId} onEscolher={curso.escolher} />
    {erro && <Aviso tipo="erro">{erro}</Aviso>}
    {carregando && <EstadoCarregando>Carregando questões...</EstadoCarregando>}
    {!carregando && !erro && !questoes.length && <EstadoSemDados titulo="Nenhuma questão por aqui ainda" acao={{ texto: 'Explorar cursos', para: '/app' }}>
      Nenhuma questão publicada para este curso. Inscreva-se em outro curso ou aguarde a publicação pelo administrador.
    </EstadoSemDados>}

    {questoes.length > 0 && <>
      <div className="questoes-barra">
        {disciplinas.length > 0 && <div className="campo questoes-barra__filtro">
          <label htmlFor="filtro-disciplina">Disciplina</label>
          <select id="filtro-disciplina" value={filtroValido ?? ''} onChange={evento => atualizarParametros({ disciplina: evento.target.value || null, pagina: null })}>
            <option value="">Todas as disciplinas</option>
            {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
          </select>
        </div>}
        <p className="questoes-barra__resumo" aria-live="polite"><strong>{respondidas} de {visiveis.length}</strong> respondidas{respondidas > 0 && ` · ${corretas} corretas`}</p>
      </div>
      <p className="painel__nota">A ordem das questões e das alternativas muda a cada visita. Você pode refazer qualquer questão; a última tentativa compõe seu desempenho.</p>
      {!visiveis.length && <p role="status">Nenhuma questão publicada para esta disciplina.</p>}

      {daPagina.map(q => {
        const numero = visiveis.indexOf(q) + 1
        const erroDaQuestao = errosPorQuestao[q.id]
        const ordem = dados?.ordens[q.id] ?? INDICES
        // Respondida e sem nova tentativa: mostra a correcao da ultima tentativa.
        const corrigida = q.resposta && !refazendo[q.id] ? q.resposta : null
        const marcada = corrigida ? corrigida.alternativa : escolhas[q.id]
        return <section key={q.id} className="questao-cartao" aria-labelledby={`questao-${q.id}`}>
          <h2 id={`questao-${q.id}`}>Questão {numero}</h2>
          <p className="questao-cartao__conteudo">{q.conteudo}</p>
          <p>{q.enunciado}</p>
          <fieldset disabled={Boolean(corrigida) || salvando !== null} aria-describedby={erroDaQuestao ? `questao-${q.id}-erro` : undefined}>
            <legend>Alternativas da questão {numero}</legend>
            {ordem.map((original, posicao) => <label className="questao-alternativa" key={original}>
              <input type="radio" name={`alternativa-${q.id}`} checked={marcada === original} onChange={() => { setEscolhas(atual => ({ ...atual, [q.id]: original })); setErrosPorQuestao(atual => ({ ...atual, [q.id]: '' })) }} />
              <span>{letra(posicao)}. {q.alternativas[original]}</span>
            </label>)}
          </fieldset>
          {erroDaQuestao && <p id={`questao-${q.id}-erro`} className="campo__erro" role="alert">{erroDaQuestao}</p>}
          {corrigida
            ? <>
              <div role="status" className={`questao-correcao questao-correcao--${corrigida.correta ? 'certa' : 'errada'}`}>
                <p><strong>{corrigida.correta ? 'Resposta correta.' : 'Resposta incorreta.'}</strong> Resposta registrada no seu desempenho{(q.tentativas ?? 1) > 1 && ` (tentativa ${q.tentativas})`}.</p>
                <p>Gabarito: {letra(ordem.indexOf(corrigida.gabarito))}.</p>
                <p>{corrigida.explicacao}</p>
              </div>
              <Botao type="button" variante="secundario" disabled={salvando !== null} onClick={() => refazer(q.id)}>{`Refazer questão ${numero}`}</Botao>
            </>
            : <Botao type="button" disabled={salvando !== null} onClick={() => responder(q.id)}>{salvando === q.id ? 'Corrigindo...' : `Responder questão ${numero}`}</Botao>}
        </section>
      })}

      {totalPaginas > 1 && <nav className="paginacao" aria-label="Páginas de questões">
        <button type="button" className="botao-link botao-link--secundario" disabled={pagina === 1} onClick={() => atualizarParametros({ pagina: String(pagina - 1) })}>Anterior</button>
        <span>Página {pagina} de {totalPaginas}</span>
        <button type="button" className="botao-link botao-link--secundario" disabled={pagina === totalPaginas} onClick={() => atualizarParametros({ pagina: String(pagina + 1) })}>Próxima</button>
      </nav>}
    </>}
  </main>
}
