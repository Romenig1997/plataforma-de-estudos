import { useState, type FormEvent } from 'react'
import { mensagemDaFalha } from '../api'
import {
  adicionarConteudo, adicionarDisciplina, excluirConteudo, excluirDisciplina, renomearConteudo, renomearDisciplina,
  type ConteudoAprovado, type EditalAprovado,
} from '../editais'

type Props = {
  token: string
  curso: EditalAprovado
  onAtualizado: (curso: EditalAprovado) => void
  onNotificar: (tipo: 'sucesso' | 'erro', mensagem: string) => void
  onEncerrarSessao: (motivo?: string) => void
}

/** Item em edicao: renomear um existente ou criar um novo (assunto ou subassunto). */
type Edicao =
  | { tipo: 'renomear-disciplina' | 'renomear-conteudo'; id: number; valor: string }
  | { tipo: 'novo-assunto'; disciplinaId: number; valor: string }
  | { tipo: 'novo-subassunto'; disciplinaId: number; paiId: number; valor: string }

const AVISO_EXCLUSAO = 'O progresso dos alunos, as questões e as atividades do cronograma ligadas a ele também serão excluídos. Esta ação não pode ser desfeita.'

const topicosDaDisciplina = (assuntos: ConteudoAprovado[]) => assuntos.reduce((s, a) => s + Math.max(1, a.subassuntos.length), 0)

/**
 * Edita a estrutura de um curso publicado: disciplinas, assuntos e
 * subassuntos. Cada acao vai direto para a API e devolve o curso atualizado;
 * excluir pede confirmacao porque apaga o que depende do item.
 */
export default function EditorDeEstruturaDoCurso({ token, curso, onAtualizado, onNotificar, onEncerrarSessao }: Props) {
  const [edicao, setEdicao] = useState<Edicao | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [novaDisciplina, setNovaDisciplina] = useState({ nome: '', assunto: '' })
  const [erroDoCampo, setErroDoCampo] = useState<string | null>(null)

  async function executar(acao: () => Promise<EditalAprovado>, sucesso: string, depois?: () => void) {
    setOcupado(true)
    try {
      onAtualizado(await acao())
      onNotificar('sucesso', sucesso)
      setEdicao(null)
      depois?.()
    } catch (falha: unknown) {
      const mensagem = mensagemDaFalha(falha, onEncerrarSessao, 'Não foi possível salvar a alteração.')
      if (mensagem) onNotificar('erro', mensagem)
    } finally {
      setOcupado(false)
    }
  }

  function salvarEdicao(evento: FormEvent) {
    evento.preventDefault()
    if (!edicao) return
    const valor = edicao.valor.trim()
    if (!valor) {
      setErroDoCampo('Informe um nome.')
      return
    }
    setErroDoCampo(null)
    const atual = edicao
    if (atual.tipo === 'novo-assunto') {
      void executar(() => adicionarConteudo(token, curso.id, atual.disciplinaId, valor, null), 'Assunto incluído.')
    } else if (atual.tipo === 'novo-subassunto') {
      void executar(() => adicionarConteudo(token, curso.id, atual.disciplinaId, valor, atual.paiId), 'Subassunto incluído.')
    } else if (atual.tipo === 'renomear-disciplina') {
      void executar(() => renomearDisciplina(token, curso.id, atual.id, valor), 'Disciplina renomeada.')
    } else {
      void executar(() => renomearConteudo(token, curso.id, atual.id, valor), 'Tópico renomeado.')
    }
  }

  function criarDisciplina(evento: FormEvent) {
    evento.preventDefault()
    const nome = novaDisciplina.nome.trim()
    const assunto = novaDisciplina.assunto.trim()
    if (!nome || !assunto) {
      onNotificar('erro', 'Informe o nome da disciplina e o primeiro assunto.')
      return
    }
    void executar(() => adicionarDisciplina(token, curso.id, nome, assunto), `Disciplina ${nome} incluída. Os planos dos inscritos foram redistribuídos.`,
      () => setNovaDisciplina({ nome: '', assunto: '' }))
  }

  function excluir(tipo: 'disciplina' | 'conteudo', id: number, nome: string) {
    const rotulo = tipo === 'disciplina' ? `a disciplina "${nome}" e todos os seus assuntos` : `o tópico "${nome}" e seus subassuntos`
    if (!confirm(`Excluir ${rotulo}? ${AVISO_EXCLUSAO}`)) return
    void executar(() => (tipo === 'disciplina' ? excluirDisciplina(token, curso.id, id) : excluirConteudo(token, curso.id, id)),
      tipo === 'disciplina' ? `Disciplina ${nome} excluída.` : `Tópico ${nome} excluído.`)
  }

  /** Campo de texto em linha para renomear ou criar; Esc cancela. */
  function formularioEmLinha(rotulo: string, textoDoBotao: string) {
    if (!edicao) return null
    return <form className="estrutura-edicao" onSubmit={salvarEdicao} noValidate>
      <label>
        <span className="visualmente-oculto">{rotulo}</span>
        <input autoFocus value={edicao.valor} maxLength={500} aria-invalid={Boolean(erroDoCampo)}
          aria-describedby={erroDoCampo ? 'estrutura-edicao-erro' : undefined}
          onChange={evento => { setErroDoCampo(null); setEdicao({ ...edicao, valor: evento.target.value }) }}
          onKeyDown={evento => { if (evento.key === 'Escape') setEdicao(null) }} />
      </label>
      <button type="submit" className="botao-link" disabled={ocupado}>{ocupado ? 'Salvando...' : textoDoBotao}</button>
      <button type="button" className="botao-link botao-link--secundario" disabled={ocupado} onClick={() => { setErroDoCampo(null); setEdicao(null) }}>Cancelar</button>
      {erroDoCampo && <span id="estrutura-edicao-erro" className="estrutura-edicao__erro" role="alert">{erroDoCampo}</span>}
    </form>
  }

  const editandoRenome = (tipo: 'renomear-disciplina' | 'renomear-conteudo', id: number) =>
    edicao !== null && edicao.tipo === tipo && edicao.id === id

  function acoes(itens: { texto: string; rotulo: string; perigo?: boolean; onClick: () => void }[]) {
    return <span className="estrutura-acoes">
      {itens.map(item => <button key={item.texto} type="button" className={`botao-texto${item.perigo ? ' botao-texto--perigo' : ''}`}
        aria-label={item.rotulo} disabled={ocupado || edicao !== null} onClick={item.onClick}>{item.texto}</button>)}
    </span>
  }

  function linhaDeConteudo(conteudo: ConteudoAprovado, disciplinaId: number, assunto: boolean) {
    return <li key={conteudo.id}>
      {editandoRenome('renomear-conteudo', conteudo.id)
        ? formularioEmLinha(`Novo nome de ${conteudo.nome}`, 'Salvar')
        : <div className="estrutura-linha">
          <span>{conteudo.nome}</span>
          {acoes([
            ...(assunto ? [{ texto: 'Subassunto', rotulo: `Incluir subassunto em ${conteudo.nome}`, onClick: () => setEdicao({ tipo: 'novo-subassunto', disciplinaId, paiId: conteudo.id, valor: '' }) }] : []),
            { texto: 'Renomear', rotulo: `Renomear ${conteudo.nome}`, onClick: () => setEdicao({ tipo: 'renomear-conteudo', id: conteudo.id, valor: conteudo.nome }) },
            { texto: 'Excluir', rotulo: `Excluir ${conteudo.nome}`, perigo: true, onClick: () => excluir('conteudo', conteudo.id, conteudo.nome) },
          ])}
        </div>}
      {(conteudo.subassuntos.length > 0 || (edicao?.tipo === 'novo-subassunto' && edicao.paiId === conteudo.id)) && <ul>
        {conteudo.subassuntos.map(sub => linhaDeConteudo(sub, disciplinaId, false))}
        {edicao?.tipo === 'novo-subassunto' && edicao.paiId === conteudo.id && <li>{formularioEmLinha(`Nome do novo subassunto de ${conteudo.nome}`, 'Incluir')}</li>}
      </ul>}
    </li>
  }

  return <div className="estrutura">
    {curso.disciplinas.map(disciplina => <details key={disciplina.id} className="estrutura-disciplina">
      <summary>
        <span>{disciplina.nome}</span>
        <span className="selo">{topicosDaDisciplina(disciplina.assuntos)} tópicos</span>
      </summary>
      <div className="estrutura-disciplina__corpo">
        {editandoRenome('renomear-disciplina', disciplina.id)
          ? formularioEmLinha(`Novo nome da disciplina ${disciplina.nome}`, 'Salvar')
          : acoes([
            { texto: 'Renomear disciplina', rotulo: `Renomear disciplina ${disciplina.nome}`, onClick: () => setEdicao({ tipo: 'renomear-disciplina', id: disciplina.id, valor: disciplina.nome }) },
            { texto: 'Excluir disciplina', rotulo: `Excluir disciplina ${disciplina.nome}`, perigo: true, onClick: () => excluir('disciplina', disciplina.id, disciplina.nome) },
          ])}
        <ul className="estrutura-assuntos">
          {disciplina.assuntos.map(assunto => linhaDeConteudo(assunto, disciplina.id, true))}
          {edicao?.tipo === 'novo-assunto' && edicao.disciplinaId === disciplina.id && <li>{formularioEmLinha(`Nome do novo assunto de ${disciplina.nome}`, 'Incluir')}</li>}
        </ul>
        {!(edicao?.tipo === 'novo-assunto' && edicao.disciplinaId === disciplina.id) &&
          <button type="button" className="botao-texto" disabled={ocupado || edicao !== null}
            onClick={() => setEdicao({ tipo: 'novo-assunto', disciplinaId: disciplina.id, valor: '' })}>+ Novo assunto em {disciplina.nome}</button>}
      </div>
    </details>)}

    <form className="estrutura-nova-disciplina" onSubmit={criarDisciplina} noValidate aria-labelledby="titulo-nova-disciplina">
      <h3 id="titulo-nova-disciplina">Nova disciplina</h3>
      <label><span>Nome da disciplina</span>
        <input value={novaDisciplina.nome} maxLength={255} disabled={ocupado} onChange={evento => setNovaDisciplina(atual => ({ ...atual, nome: evento.target.value }))} />
      </label>
      <label><span>Primeiro assunto</span>
        <input value={novaDisciplina.assunto} maxLength={500} disabled={ocupado} onChange={evento => setNovaDisciplina(atual => ({ ...atual, assunto: evento.target.value }))} />
      </label>
      <button type="submit" className="botao-link" disabled={ocupado}>Incluir disciplina</button>
    </form>
  </div>
}
