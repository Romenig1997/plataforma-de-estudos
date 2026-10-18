import { useState, type FormEvent } from 'react'
import { mensagemDaFalha } from '../api'
import {
  adicionarConteudo, adicionarDisciplina, excluirConteudo, excluirDisciplina, renomearConteudo, renomearDisciplina,
  type ConteudoAprovado, type EditalAprovado,
} from '../editais'
import { ChevronRightIcon, PlusIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

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
    return <form className="flex flex-col gap-2 py-1 sm:flex-row sm:flex-wrap sm:items-center" onSubmit={salvarEdicao} noValidate>
      <label className="min-w-0 flex-1">
        <span className="sr-only">{rotulo}</span>
        <Input className="h-9" autoFocus value={edicao.valor} maxLength={500} aria-invalid={Boolean(erroDoCampo)}
          aria-describedby={erroDoCampo ? 'estrutura-edicao-erro' : undefined}
          onChange={evento => { setErroDoCampo(null); setEdicao({ ...edicao, valor: evento.target.value }) }}
          onKeyDown={evento => { if (evento.key === 'Escape') setEdicao(null) }} />
      </label>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={ocupado}>{ocupado ? 'Salvando...' : textoDoBotao}</Button>
        <Button type="button" size="sm" variant="outline" disabled={ocupado} onClick={() => { setErroDoCampo(null); setEdicao(null) }}>Cancelar</Button>
      </div>
      {erroDoCampo && <span id="estrutura-edicao-erro" className="w-full text-xs font-medium text-destructive" role="alert">{erroDoCampo}</span>}
    </form>
  }

  const editandoRenome = (tipo: 'renomear-disciplina' | 'renomear-conteudo', id: number) =>
    edicao !== null && edicao.tipo === tipo && edicao.id === id

  function acoes(itens: { texto: string; rotulo: string; perigo?: boolean; onClick: () => void }[]) {
    return <span className="flex shrink-0 flex-wrap items-center gap-1">
      {itens.map(item => <Button key={item.texto} type="button" variant="ghost" size="sm"
        className={cn('h-7 px-2 text-xs', item.perigo && 'text-destructive hover:bg-destructive-soft hover:text-destructive')}
        aria-label={item.rotulo} disabled={ocupado || edicao !== null} onClick={item.onClick}>{item.texto}</Button>)}
    </span>
  }

  function linhaDeConteudo(conteudo: ConteudoAprovado, disciplinaId: number, assunto: boolean) {
    return <li key={conteudo.id} className="flex flex-col">
      {editandoRenome('renomear-conteudo', conteudo.id)
        ? formularioEmLinha(`Novo nome de ${conteudo.nome}`, 'Salvar')
        : <div className="flex flex-col gap-1 rounded-md px-2 py-1.5 hover:bg-muted/60 sm:flex-row sm:items-center">
          <span className={cn('min-w-0 flex-1 text-sm', assunto ? 'font-medium' : 'text-muted-foreground')}>{conteudo.nome}</span>
          {acoes([
            ...(assunto ? [{ texto: 'Subassunto', rotulo: `Incluir subassunto em ${conteudo.nome}`, onClick: () => setEdicao({ tipo: 'novo-subassunto', disciplinaId, paiId: conteudo.id, valor: '' }) }] : []),
            { texto: 'Renomear', rotulo: `Renomear ${conteudo.nome}`, onClick: () => setEdicao({ tipo: 'renomear-conteudo', id: conteudo.id, valor: conteudo.nome }) },
            { texto: 'Excluir', rotulo: `Excluir ${conteudo.nome}`, perigo: true, onClick: () => excluir('conteudo', conteudo.id, conteudo.nome) },
          ])}
        </div>}
      {(conteudo.subassuntos.length > 0 || (edicao?.tipo === 'novo-subassunto' && edicao.paiId === conteudo.id)) && <ul className="ml-4 flex flex-col border-l pl-3">
        {conteudo.subassuntos.map(sub => linhaDeConteudo(sub, disciplinaId, false))}
        {edicao?.tipo === 'novo-subassunto' && edicao.paiId === conteudo.id && <li>{formularioEmLinha(`Nome do novo subassunto de ${conteudo.nome}`, 'Incluir')}</li>}
      </ul>}
    </li>
  }

  return <div className="flex flex-col gap-3">
    {curso.disciplinas.map(disciplina => <details key={disciplina.id} className="group rounded-lg border bg-card open:shadow-xs">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-lg px-4 py-3 font-medium transition-colors hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden="true" />
        <span className="min-w-0 flex-1">{disciplina.nome}</span>
        <Badge variant="secondary">{topicosDaDisciplina(disciplina.assuntos)} tópicos</Badge>
      </summary>
      <div className="flex flex-col gap-3 border-t px-4 py-3">
        {editandoRenome('renomear-disciplina', disciplina.id)
          ? formularioEmLinha(`Novo nome da disciplina ${disciplina.nome}`, 'Salvar')
          : acoes([
            { texto: 'Renomear disciplina', rotulo: `Renomear disciplina ${disciplina.nome}`, onClick: () => setEdicao({ tipo: 'renomear-disciplina', id: disciplina.id, valor: disciplina.nome }) },
            { texto: 'Excluir disciplina', rotulo: `Excluir disciplina ${disciplina.nome}`, perigo: true, onClick: () => excluir('disciplina', disciplina.id, disciplina.nome) },
          ])}
        <ul className="flex flex-col gap-0.5">
          {disciplina.assuntos.map(assunto => linhaDeConteudo(assunto, disciplina.id, true))}
          {edicao?.tipo === 'novo-assunto' && edicao.disciplinaId === disciplina.id && <li>{formularioEmLinha(`Nome do novo assunto de ${disciplina.nome}`, 'Incluir')}</li>}
        </ul>
        {!(edicao?.tipo === 'novo-assunto' && edicao.disciplinaId === disciplina.id) &&
          <Button type="button" variant="link" size="sm" className="self-start" disabled={ocupado || edicao !== null}
            onClick={() => setEdicao({ tipo: 'novo-assunto', disciplinaId: disciplina.id, valor: '' })}><PlusIcon aria-hidden="true" />Novo assunto em {disciplina.nome}</Button>}
      </div>
    </details>)}

    <form className="mt-2 flex flex-col gap-3 rounded-lg border border-dashed p-4" onSubmit={criarDisciplina} noValidate aria-labelledby="titulo-nova-disciplina">
      <h3 id="titulo-nova-disciplina" className="font-semibold">Nova disciplina</h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-medium"><span>Nome da disciplina</span>
          <Input value={novaDisciplina.nome} maxLength={255} disabled={ocupado} onChange={evento => setNovaDisciplina(atual => ({ ...atual, nome: evento.target.value }))} />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium"><span>Primeiro assunto</span>
          <Input value={novaDisciplina.assunto} maxLength={500} disabled={ocupado} onChange={evento => setNovaDisciplina(atual => ({ ...atual, assunto: evento.target.value }))} />
        </label>
      </div>
      <Button type="submit" className="self-start" disabled={ocupado}><PlusIcon aria-hidden="true" />Incluir disciplina</Button>
    </form>
  </div>
}
