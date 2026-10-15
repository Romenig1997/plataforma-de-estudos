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

type Props = { token: string; onEncerrarSessao: (motivo?: string) => void }
type DadosDasQuestoes = { questoes: QuestaoAluno[]; plano: Plano | null }

const POR_PAGINA = 10

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
    return { questoes, plano }
  }, [token, curso.editalId])
  const { dados, definirDados, carregando, erro, recarregar } = useRecurso(carregar, onEncerrarSessao, 'Não foi possível carregar as questões. Tente novamente.')
  const [escolhas, setEscolhas] = useState<Record<number, number>>({})
  const [errosPorQuestao, setErrosPorQuestao] = useState<Record<number, string>>({})
  const [salvando, setSalvando] = useState<number | null>(null)

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
      definirDados(dados && { ...dados, questoes: dados.questoes.map(q => (q.id === id ? { ...q, resposta } : q)) })
    } catch (falha: unknown) {
      const mensagem = mensagemDaFalha(falha, onEncerrarSessao, 'Não foi possível registrar a resposta.')
      if (mensagem) setErrosPorQuestao(atual => ({ ...atual, [id]: mensagem }))
      // 409: a questao ja foi respondida em outra aba; recarrega o estado real.
      if (falha instanceof ErroDeApi && falha.status === 409) recarregar()
    } finally {
      setSalvando(null)
    }
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
      <p className="painel__nota">A primeira resposta de cada questão compõe seu desempenho e atualiza o painel e a análise.</p>
      {!visiveis.length && <p role="status">Nenhuma questão publicada para esta disciplina.</p>}

      {daPagina.map(q => {
        const numero = visiveis.indexOf(q) + 1
        const erroDaQuestao = errosPorQuestao[q.id]
        return <section key={q.id} className="questao-cartao" aria-labelledby={`questao-${q.id}`}>
          <h2 id={`questao-${q.id}`}>Questão {numero}</h2>
          <p className="questao-cartao__conteudo">{q.conteudo}</p>
          <p>{q.enunciado}</p>
          <fieldset disabled={Boolean(q.resposta) || salvando !== null} aria-describedby={erroDaQuestao ? `questao-${q.id}-erro` : undefined}>
            <legend>Alternativas da questão {numero}</legend>
            {q.alternativas.map((alternativa, n) => <label className="questao-alternativa" key={n}>
              <input type="radio" name={`alternativa-${q.id}`} checked={(q.resposta?.alternativa ?? escolhas[q.id]) === n} onChange={() => { setEscolhas(atual => ({ ...atual, [q.id]: n })); setErrosPorQuestao(atual => ({ ...atual, [q.id]: '' })) }} />
              <span>{String.fromCharCode(65 + n)}. {alternativa}</span>
            </label>)}
          </fieldset>
          {erroDaQuestao && <p id={`questao-${q.id}-erro`} className="campo__erro" role="alert">{erroDaQuestao}</p>}
          {q.resposta
            ? <div role="status" className={`questao-correcao questao-correcao--${q.resposta.correta ? 'certa' : 'errada'}`}>
              <p><strong>{q.resposta.correta ? 'Resposta correta.' : 'Resposta incorreta.'}</strong> Resposta registrada no seu desempenho.</p>
              <p>Gabarito: {String.fromCharCode(65 + q.resposta.gabarito)}.</p>
              <p>{q.resposta.explicacao}</p>
            </div>
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
