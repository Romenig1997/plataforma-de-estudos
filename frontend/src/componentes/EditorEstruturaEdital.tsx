import type { ConteudoExtraido } from '../editais'
import { Input } from '@/components/ui/input'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const ACAO = buttonVariants({ variant: 'outline', size: 'sm' })
const REMOVER = cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-destructive hover:bg-destructive-soft hover:text-destructive')

type Disciplina = ConteudoExtraido['disciplinas'][number]
type Assunto = Disciplina['assuntos'][number]
type Subassunto = Assunto['subassuntos'][number]

type Props = {
  conteudo: ConteudoExtraido
  totalPaginas: number
  disabled?: boolean
  onChange: (conteudo: ConteudoExtraido) => void
}

const paginaInicial = 1

function numeroDePagina(valor: string, limite: number): number {
  const pagina = Number(valor)
  if (!Number.isFinite(pagina)) return paginaInicial
  return Math.max(paginaInicial, Math.min(limite, Math.trunc(pagina)))
}

function novaDisciplina(): Disciplina {
  return { nome: '', pagina: paginaInicial, assuntos: [] }
}

function novoAssunto(): Assunto {
  return { nome: '', pagina: paginaInicial, subassuntos: [] }
}

function novoSubassunto(): Subassunto {
  return { nome: '', pagina: paginaInicial }
}

/**
 * Editor manual da arvore de um edital.
 *
 * A importacao manual pode encontrar os metadados do PDF sem conseguir
 * identificar disciplinas. Este componente permite completar ou corrigir essa
 * estrutura antes de envia-la para a validacao do backend.
 */
function EditorEstruturaEdital({ conteudo, totalPaginas, disabled = false, onChange }: Props) {
  const limiteDePaginas = Math.max(paginaInicial, totalPaginas)

  function atualizarDisciplina(indice: number, atualizada: Disciplina) {
    onChange({
      ...conteudo,
      disciplinas: conteudo.disciplinas.map((disciplina, indiceAtual) =>
        indiceAtual === indice ? atualizada : disciplina,
      ),
    })
  }

  function atualizarAssunto(indiceDisciplina: number, indiceAssunto: number, atualizado: Assunto) {
    const disciplina = conteudo.disciplinas[indiceDisciplina]
    atualizarDisciplina(indiceDisciplina, {
      ...disciplina,
      assuntos: disciplina.assuntos.map((assunto, indiceAtual) =>
        indiceAtual === indiceAssunto ? atualizado : assunto,
      ),
    })
  }

  return (
    <section className="flex flex-col gap-4" aria-labelledby="titulo-estrutura-edital">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between [&_h3]:font-semibold [&_p]:text-sm [&_p]:text-muted-foreground">
        <div>
          <h3 id="titulo-estrutura-edital">Disciplinas e conteúdos</h3>
          <p>
            Revise a estrutura extraída ou cadastre manualmente as disciplinas encontradas no PDF.
          </p>
        </div>
        <button
          type="button"
          className={ACAO}
          disabled={disabled}
          onClick={() => onChange({ ...conteudo, disciplinas: [...conteudo.disciplinas, novaDisciplina()] })}
        >
          Adicionar disciplina
        </button>
      </div>

      {conteudo.disciplinas.length === 0 && (
        <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground" role="status">
          Nenhuma disciplina foi identificada. Adicione pelo menos uma disciplina para validar o edital.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {conteudo.disciplinas.map((disciplina, indiceDisciplina) => (
          <fieldset className="flex min-w-0 flex-col gap-3 rounded-xl border bg-muted/30 p-4 [&>legend]:px-1 [&>legend]:text-sm [&>legend]:font-semibold [&>legend]:text-primary" key={`disciplina-${indiceDisciplina}`}>
            <legend>Disciplina {indiceDisciplina + 1}</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_7rem] [&_label]:flex [&_label]:flex-col [&_label]:gap-1.5 [&_label]:text-xs [&_label]:font-medium [&_label]:text-muted-foreground">
              <label>
                Nome da disciplina
                <Input className="h-9"
                  aria-label={`Nome da disciplina ${indiceDisciplina + 1}`}
                  type="text"
                  value={disciplina.nome}
                  disabled={disabled}
                  onChange={(evento) => atualizarDisciplina(indiceDisciplina, { ...disciplina, nome: evento.target.value })}
                />
              </label>
              <label>
                Página
                <Input className="h-9"
                  aria-label={`Página da disciplina ${indiceDisciplina + 1}`}
                  type="number"
                  min={paginaInicial}
                  max={limiteDePaginas}
                  value={disciplina.pagina}
                  disabled={disabled}
                  onChange={(evento) => atualizarDisciplina(indiceDisciplina, {
                    ...disciplina,
                    pagina: numeroDePagina(evento.target.value, limiteDePaginas),
                  })}
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={ACAO}
                disabled={disabled}
                onClick={() => atualizarDisciplina(indiceDisciplina, {
                  ...disciplina,
                  assuntos: [...disciplina.assuntos, novoAssunto()],
                })}
              >
                Adicionar assunto
              </button>
              <button
                type="button"
                className={REMOVER}
                disabled={disabled}
                onClick={() => onChange({
                  ...conteudo,
                  disciplinas: conteudo.disciplinas.filter((_, indiceAtual) => indiceAtual !== indiceDisciplina),
                })}
              >
                Remover disciplina
              </button>
            </div>

            {disciplina.assuntos.length === 0 && <p className="text-xs text-warning">Inclua pelo menos um tópico para que esta disciplina possa virar uma aula no curso.</p>}
            {disciplina.assuntos.map((assunto, indiceAssunto) => (
              <div className="ml-2 flex flex-col gap-3 rounded-lg border bg-card p-3 sm:ml-4" key={`assunto-${indiceAssunto}`}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_7rem] [&_label]:flex [&_label]:flex-col [&_label]:gap-1.5 [&_label]:text-xs [&_label]:font-medium [&_label]:text-muted-foreground">
                  <label>
                    Assunto {indiceAssunto + 1}
                    <Input className="h-9"
                      aria-label={`Assunto ${indiceAssunto + 1} da disciplina ${indiceDisciplina + 1}`}
                      type="text"
                      value={assunto.nome}
                      disabled={disabled}
                      onChange={(evento) => atualizarAssunto(indiceDisciplina, indiceAssunto, {
                        ...assunto,
                        nome: evento.target.value,
                      })}
                    />
                  </label>
                  <label>
                    Página
                    <Input className="h-9"
                      aria-label={`Página do assunto ${indiceAssunto + 1} da disciplina ${indiceDisciplina + 1}`}
                      type="number"
                      min={paginaInicial}
                      max={limiteDePaginas}
                      value={assunto.pagina}
                      disabled={disabled}
                      onChange={(evento) => atualizarAssunto(indiceDisciplina, indiceAssunto, {
                        ...assunto,
                        pagina: numeroDePagina(evento.target.value, limiteDePaginas),
                      })}
                    />
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={ACAO}
                    disabled={disabled}
                    onClick={() => atualizarAssunto(indiceDisciplina, indiceAssunto, {
                      ...assunto,
                      subassuntos: [...assunto.subassuntos, novoSubassunto()],
                    })}
                  >
                    Adicionar subassunto
                  </button>
                  <button
                    type="button"
                    className={REMOVER}
                    disabled={disabled}
                    onClick={() => atualizarDisciplina(indiceDisciplina, {
                      ...disciplina,
                      assuntos: disciplina.assuntos.filter((_, indiceAtual) => indiceAtual !== indiceAssunto),
                    })}
                  >
                    Remover assunto
                  </button>
                </div>

                {assunto.subassuntos.map((subassunto, indiceSubassunto) => (
                  <div className="ml-2 grid grid-cols-1 items-end gap-3 border-l-2 pl-3 sm:ml-4 sm:grid-cols-[minmax(0,1fr)_7rem_auto] [&_label]:flex [&_label]:flex-col [&_label]:gap-1.5 [&_label]:text-xs [&_label]:font-medium [&_label]:text-muted-foreground" key={`subassunto-${indiceSubassunto}`}>
                    <label>
                      Subassunto {indiceSubassunto + 1}
                      <Input className="h-9"
                        aria-label={`Subassunto ${indiceSubassunto + 1} do assunto ${indiceAssunto + 1} da disciplina ${indiceDisciplina + 1}`}
                        type="text"
                        value={subassunto.nome}
                        disabled={disabled}
                        onChange={(evento) => atualizarAssunto(indiceDisciplina, indiceAssunto, {
                          ...assunto,
                          subassuntos: assunto.subassuntos.map((item, indiceAtual) =>
                            indiceAtual === indiceSubassunto ? { ...item, nome: evento.target.value } : item,
                          ),
                        })}
                      />
                    </label>
                    <label>
                      Página
                      <Input className="h-9"
                        aria-label={`Página do subassunto ${indiceSubassunto + 1} do assunto ${indiceAssunto + 1} da disciplina ${indiceDisciplina + 1}`}
                        type="number"
                        min={paginaInicial}
                        max={limiteDePaginas}
                        value={subassunto.pagina}
                        disabled={disabled}
                        onChange={(evento) => atualizarAssunto(indiceDisciplina, indiceAssunto, {
                          ...assunto,
                          subassuntos: assunto.subassuntos.map((item, indiceAtual) =>
                            indiceAtual === indiceSubassunto
                              ? { ...item, pagina: numeroDePagina(evento.target.value, limiteDePaginas) }
                              : item,
                          ),
                        })}
                      />
                    </label>
                    <button
                      type="button"
                      className={REMOVER}
                      disabled={disabled}
                      onClick={() => atualizarAssunto(indiceDisciplina, indiceAssunto, {
                        ...assunto,
                        subassuntos: assunto.subassuntos.filter((_, indiceAtual) => indiceAtual !== indiceSubassunto),
                      })}
                    >
                      Remover subassunto
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </fieldset>
        ))}
      </div>
    </section>
  )
}

export default EditorEstruturaEdital
