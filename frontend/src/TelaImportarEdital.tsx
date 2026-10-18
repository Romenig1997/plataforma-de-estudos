import { useCallback, useEffect, useRef, useState } from 'react'
import {
  aprovarImportacao,
  baixarPdf,
  buscarImportacao,
  excluirImportacao,
  importarPDF,
  listarImportacoes,
  lerEstruturaRevisada,
  rejeitarImportacao,
  reprocessarImportacao,
  revisarConteudo,
  estruturarLocalmenteImportacao,
  type ConteudoExtraido,
  type ImportacaoDeEdital,
  type StatusDeImportacao,
} from './editais'
import { ErroDeApi, ErroDeRede, SessaoEncerrada } from './sessao'
import Aviso from './componentes/Aviso'
import Notificacao from './componentes/Notificacao'
import Botao from './componentes/Botao'
import CampoFormulario from './componentes/CampoFormulario'
import { CabecalhoDaPagina, Conteudo } from './componentes/Pagina'
import CursosPublicados from './componentes/CursosPublicados'
import EditorEstruturaEdital from './componentes/EditorEstruturaEdital'
import EstadoCarregando from './componentes/EstadoCarregando'
import EstadoVazio from './componentes/EstadoVazio'
import Tabela from './componentes/Tabela'
import { ArrowLeftIcon, FileTextIcon, UploadIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type Props = {
  token: string
  onVoltar: () => void
  onEncerrarSessao: (motivo?: string) => void
}

const STATUS_LEGIVEL: Record<StatusDeImportacao, string> = {
  AGUARDANDO_EXTRACAO: 'Extraindo...',
  AGUARDANDO_REVISAO: 'Aguardando revisão',
  FALHA: 'Falha na extração',
  APROVADO: 'Aprovado',
  REJEITADO: 'Rejeitado',
}

const VARIANTE_DO_STATUS = {
  AGUARDANDO_EXTRACAO: 'info',
  AGUARDANDO_REVISAO: 'warning',
  FALHA: 'destructive',
  APROVADO: 'success',
  REJEITADO: 'secondary',
} as const satisfies Record<StatusDeImportacao, string>

/** Deve acompanhar o limite validado pelo backend e pelo proxy Nginx. */
const LIMITE_PDF_EM_BYTES = 30 * 1024 * 1024

function mensagemDeFalha(falha: unknown, padrao: string): string {
  if (falha instanceof ErroDeRede) {
    return 'Não foi possível conectar ao servidor. Verifique se o backend está em execução.'
  }
  if (falha instanceof ErroDeApi) {
    return (
      falha.mensagemDoCampo('arquivo') ??
      falha.mensagemDoCampo('estado') ??
      falha.mensagemDoCampo('edital') ??
      falha.message
    )
  }
  return padrao
}

/**
 * Importacao de editais em PDF (HU07, incremento A) - tela do ADMIN.
 *
 * <p>Faz o upload do PDF, lista as importacoes, abre a revisao do conteudo
 * extraido pela IA (com a referencia de pagina de cada disciplina) e decide
 * aprovar, rejeitar ou reprocessar. So o backend decide o que vale: erros de
 * validacao da arvore voltam em `errosEmJson` e aparecem na tela; aprovado, o
 * edital passa a aparecer no catalogo que o planner consome (incremento C).
 */
function TelaImportarEdital({ token, onVoltar, onEncerrarSessao }: Props) {
  const [importacoes, setImportacoes] = useState<ImportacaoDeEdital[] | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erroDeLista, setErroDeLista] = useState<string | null>(null)
  const [tentativa, setTentativa] = useState(0)

  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [erroDeUpload, setErroDeUpload] = useState<string | null>(null)

  const [detalhe, setDetalhe] = useState<ImportacaoDeEdital | null>(null)
  const [extraido, setExtraido] = useState<ConteudoExtraido | null>(null)
  const [erroDeDetalhe, setErroDeDetalhe] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [operando, setOperando] = useState<number | null>(null)
  const [excluindo, setExcluindo] = useState<number | null>(null)
  const entradaArquivo = useRef<HTMLInputElement>(null)

  async function carregarEstrutura(arquivo?: File) {
    if (!arquivo) return
    setErroDeDetalhe(null)
    setAviso(null)
    try {
      if (arquivo.size > 10 * 1024 * 1024) throw new Error('O arquivo de revisão deve ter até 10 MB.')
      setExtraido(lerEstruturaRevisada(await arquivo.text()))
      setAviso('Estrutura carregada para conferência. Salve as alterações antes de aprovar.')
    } catch {
      setErroDeDetalhe('Não foi possível ler a estrutura. Use um arquivo de revisão válido, de até 10 MB.')
    }
  }

  const carregar = useCallback(async () => {
    try {
      setImportacoes(await listarImportacoes(token))
      setErroDeLista(null)
    } catch (falha: unknown) {
      if (falha instanceof SessaoEncerrada) {
        onEncerrarSessao('Sua sessão expirou. Faça login novamente.')
        return
      }
      setErroDeLista(mensagemDeFalha(falha, 'Não foi possível carregar as importações.'))
    } finally {
      setCarregando(false)
    }
  }, [token, onEncerrarSessao])

  useEffect(() => {
    let descartado = false
    listarImportacoes(token)
      .then((lista) => {
        if (!descartado) setImportacoes(lista)
      })
      .catch((falha: unknown) => {
        if (descartado) return
        if (falha instanceof SessaoEncerrada) {
          onEncerrarSessao('Sua sessão expirou. Faça login novamente.')
          return
        }
        setErroDeLista(mensagemDeFalha(falha, 'Não foi possível carregar as importações.'))
      })
      .finally(() => {
        if (!descartado) setCarregando(false)
      })

    return () => {
      descartado = true
    }
  }, [token, onEncerrarSessao, tentativa])

  const tentarNovamente = useCallback(() => {
    setImportacoes(null)
    setErroDeLista(null)
    setCarregando(true)
    setTentativa((numero) => numero + 1)
  }, [])

  async function importar() {
    if (!arquivoSelecionado) {
      setErroDeUpload('Selecione um arquivo PDF do edital.')
      return
    }

    setEnviando(true)
    setErroDeUpload(null)
    setAviso(null)
    try {
      const criada = await importarPDF(token, arquivoSelecionado)
      setArquivoSelecionado(null)
      if (entradaArquivo.current) entradaArquivo.current.value = ''
      await carregar()
      await abrirRevisao(criada.id)
      if (criada.status === 'AGUARDANDO_REVISAO') {
        setAviso('PDF importado: texto extraído e organizado para revisão.')
      }
    } catch (falha: unknown) {
      if (falha instanceof SessaoEncerrada) {
        onEncerrarSessao('Sua sessão expirou. Faça login novamente.')
        return
      }
      setErroDeUpload(
        falha instanceof ErroDeApi
          ? (falha.mensagemDoCampo('arquivo') ?? 'Não foi possível importar o PDF.')
          : mensagemDeFalha(falha, 'Não foi possível importar o PDF.'),
      )
    } finally {
      setEnviando(false)
    }
  }

  async function abrirRevisao(id: number) {
    setErroDeDetalhe(null)
    setAviso(null)
    try {
      const aberta = await buscarImportacao(token, id)
      setDetalhe(aberta)
      setExtraido(aberta.conteudoEmJson ? (JSON.parse(aberta.conteudoEmJson) as ConteudoExtraido) : null)
    } catch (falha: unknown) {
      if (falha instanceof SessaoEncerrada) {
        onEncerrarSessao('Sua sessão expirou. Faça login novamente.')
        return
      }
      setErroDeDetalhe(mensagemDeFalha(falha, 'Não foi possível abrir a revisão.'))
    }
  }

  async function excluirImportacaoSelecionada(id: number, nomeArquivo: string) {
    if (!confirm(`Excluir a importação "${nomeArquivo}"? Esta ação não pode ser desfeita.`)) {
      return
    }
    setExcluindo(id)
    setErroDeDetalhe(null)
    setAviso(null)
    try {
      await excluirImportacao(token, id)
      await carregar()
      setAviso('Importação excluída com sucesso.')
      if (detalhe?.id === id) {
        setDetalhe(null)
        setExtraido(null)
      }
    } catch (falha: unknown) {
      if (falha instanceof SessaoEncerrada) {
        onEncerrarSessao('Sua sessão expirou. Faça login novamente.')
        return
      }
      setErroDeDetalhe(mensagemDeFalha(falha, 'Não foi possível excluir a importação.'))
    } finally {
      setExcluindo(null)
    }
  }

  /** A importacao aprovada que gerou o curso sai junto: fecha a revisao dela e recarrega a lista. */
  function cursoExcluido() {
    if (detalhe?.status === 'APROVADO') {
      setDetalhe(null)
      setExtraido(null)
    }
    void carregar()
  }

  async function agir(
    acao: (token: string, id: number) => Promise<ImportacaoDeEdital>,
    id: number,
    sucesso: string,
  ) {
    if (!detalhe || detalhe.id !== id) return
    setOperando(id)
    setErroDeDetalhe(null)
    setAviso(null)
    try {
      const atualizada = await acao(token, id)
      setDetalhe(atualizada)
      setExtraido(atualizada.conteudoEmJson ? (JSON.parse(atualizada.conteudoEmJson) as ConteudoExtraido) : null)
      await carregar()
      if (atualizada.status !== 'FALHA') setAviso(sucesso)
    } catch (falha: unknown) {
      if (falha instanceof SessaoEncerrada) {
        onEncerrarSessao('Sua sessão expirou. Faça login novamente.')
        return
      }
      setErroDeDetalhe(mensagemDeFalha(falha, 'Não foi possível concluir a ação.'))
    } finally {
      setOperando(null)
    }
  }

  async function salvarRevisao() {
    if (!detalhe || !extraido) return
    setOperando(detalhe.id)
    setErroDeDetalhe(null)
    setAviso(null)
    try {
      const atualizada = await revisarConteudo(token, detalhe.id, {
        ...extraido,
        ano: Number(extraido.ano),
      })
      setDetalhe(atualizada)
      setExtraido(atualizada.conteudoEmJson ? (JSON.parse(atualizada.conteudoEmJson) as ConteudoExtraido) : null)
      await carregar()
      setAviso('Revisão salva e revalidada.')
    } catch (falha: unknown) {
      if (falha instanceof SessaoEncerrada) {
        onEncerrarSessao('Sua sessão expirou. Faça login novamente.')
        return
      }
      setErroDeDetalhe(mensagemDeFalha(falha, 'Não foi possível salvar a revisão.'))
    } finally {
      setOperando(null)
    }
  }

  async function baixar(nomeDoArquivo: string, idDaImportacao?: number) {
    const id = idDaImportacao ?? detalhe?.id
    if (!id) return
    try {
      const blob = await baixarPdf(token, id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = nomeDoArquivo
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (falha: unknown) {
      if (falha instanceof SessaoEncerrada) {
        onEncerrarSessao('Sua sessão expirou. Faça login novamente.')
        return
      }
      setErroDeDetalhe(mensagemDeFalha(falha, 'Não foi possível baixar o PDF.'))
    }
  }

  const errosDeValidacao = detalhe?.errosEmJson
    ? (JSON.parse(detalhe.errosEmJson) as { campo: string; mensagem: string }[])
    : []

  return (
    <Conteudo largura="larga">
      <CabecalhoDaPagina
        sobretitulo="PAINEL DE GESTÃO"
        titulo="Importar editais"
        descricao="Carregue o PDF de um edital para extrair disciplinas e conteúdos."
        acoes={<Botao type="button" variante="secundario" onClick={onVoltar}><ArrowLeftIcon aria-hidden="true" />Voltar</Botao>}
      />
        <Card className="gap-4"><CardContent>
        <form
          className="flex flex-col gap-4 md:flex-row md:items-end"
          data-testid="formulario-importacao"
          onSubmit={(evento) => {
            evento.preventDefault()
            void importar()
          }}
        >
          <CampoFormulario
            id="arquivo-edital"
            className="flex-1"
            rotulo="PDF do edital"
            ajuda="Apenas PDF, até 30 MB."
            erro={erroDeUpload ?? undefined}
          >
            <Input
              ref={entradaArquivo}
              className="cursor-pointer py-1.5"
              type="file"
              accept="application/pdf"
              onChange={(evento) => {
                const arquivo = evento.target.files?.[0] ?? null
                if (arquivo && arquivo.size > LIMITE_PDF_EM_BYTES) {
                  setArquivoSelecionado(null)
                  setErroDeUpload('O PDF do edital deve ter até 30 MB.')
                  evento.target.value = ''
                  return
                }
                setArquivoSelecionado(arquivo)
                setErroDeUpload(null)
              }}
            />
          </CampoFormulario>

          <Botao type="submit" carregando={enviando} disabled={!arquivoSelecionado} className="md:mb-[1.625rem]">
            {!enviando && <UploadIcon aria-hidden="true" />}
            {enviando ? 'Importando e extraindo...' : 'Importar edital'}
          </Botao>
        </form>
        </CardContent></Card>

        <section className="flex flex-col gap-4" aria-labelledby="titulo-importacoes">
        <h2 id="titulo-importacoes" className="text-lg font-semibold">Importações</h2>

        {erroDeLista && <Aviso tipo="erro">{erroDeLista}</Aviso>}

        {carregando && <EstadoCarregando formato="tabela">Carregando importações...</EstadoCarregando>}

        {!carregando && !erroDeLista && importacoes && importacoes.length === 0 && (
          <EstadoVazio>Nenhuma importação até agora.</EstadoVazio>
        )}

        {!carregando && !erroDeLista && importacoes && importacoes.length > 0 && (
          <Tabela>
            <thead>
              <tr>
                <th scope="col">Arquivo</th>
                <th scope="col">Páginas</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {importacoes.map((importacao) => (
                <tr key={importacao.id}>
                  <td className="min-w-48 font-medium">{importacao.nomeArquivo}</td>
                  <td className="tabular-nums">{importacao.totalPaginas}</td>
                  <td><Badge variant={VARIANTE_DO_STATUS[importacao.status]}>{STATUS_LEGIVEL[importacao.status]}</Badge></td>
                  <td>
                    <div className="flex justify-end gap-2">
                      <Botao
                        type="button"
                        variante="secundario"
                        tamanho="pequeno"
                        onClick={() => void abrirRevisao(importacao.id)}
                      >
                        Revisar
                      </Botao>
                      <Botao
                        type="button"
                        variante="fantasma"
                        tamanho="pequeno"
                        onClick={() => void baixar(importacao.nomeArquivo, importacao.id)}
                      >
                        Baixar PDF
                      </Botao>
                      <Botao
                        type="button"
                        variante="fantasma"
                        tamanho="pequeno"
                        className="text-destructive hover:bg-destructive-soft hover:text-destructive"
                        carregando={excluindo === importacao.id}
                        onClick={() =>
                          void excluirImportacaoSelecionada(importacao.id, importacao.nomeArquivo)
                        }
                      >
                        Excluir
                      </Botao>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Tabela>
        )}

        {erroDeLista && (
          <div className="flex">
            <Botao type="button" variante="secundario" onClick={tentarNovamente}>
              Tentar novamente
            </Botao>
          </div>
        )}
        </section>

        {aviso && <Notificacao tipo="sucesso" mensagem={aviso} onFechar={() => setAviso(null)} />}
        {erroDeDetalhe && <Notificacao tipo="erro" mensagem={erroDeDetalhe} onFechar={() => setErroDeDetalhe(null)} />}

        {detalhe && (
          <section className="flex flex-col gap-5 rounded-xl border border-primary/25 bg-card p-6 shadow-sm" data-testid="painel-de-revisao">
            <h2 className="flex flex-wrap items-center gap-3 text-lg font-semibold">
              <FileTextIcon className="size-5 text-primary" aria-hidden="true" />
              {detalhe.nomeArquivo}
              <Badge variant={VARIANTE_DO_STATUS[detalhe.status]}>{STATUS_LEGIVEL[detalhe.status]}</Badge>
            </h2>

            {detalhe.status === 'FALHA' && (
              <Aviso tipo="erro">
                O PDF foi salvo, mas a extração com a IA falhou. Você pode carregar a estrutura revisada para continuar sem IA, reprocessar ou rejeitar esta importação.
              </Aviso>
            )}

            {(detalhe.status === 'AGUARDANDO_REVISAO' || detalhe.status === 'FALHA') && (
              <CampoFormulario id="estrutura-edital" rotulo="Importar uma estrutura revisada"
                ajuda="Opcional: carregue um arquivo .json preparado a partir do edital. Você também pode editar a estrutura logo abaixo, sem usar IA.">
                <Input className="cursor-pointer py-1.5" type="file" accept=".json,application/json" disabled={operando !== null}
                  onChange={evento => void carregarEstrutura(evento.target.files?.[0])} />
              </CampoFormulario>
            )}

            {(detalhe.status === 'AGUARDANDO_REVISAO' || detalhe.status === 'FALHA') && extraido && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_8rem]">
                <CampoFormulario id="conteudo-titulo" rotulo="Título do edital">
                  <Input
                    type="text"
                    value={extraido.titulo}
                    onChange={(evento) => setExtraido({ ...extraido, titulo: evento.target.value })}
                  />
                </CampoFormulario>
                <CampoFormulario id="conteudo-orgao" rotulo="Órgão">
                  <Input
                    type="text"
                    value={extraido.orgao}
                    onChange={(evento) => setExtraido({ ...extraido, orgao: evento.target.value })}
                  />
                </CampoFormulario>
                <CampoFormulario id="conteudo-ano" rotulo="Ano">
                  <Input
                    type="number"
                    min={1900}
                    max={2100}
                    value={extraido.ano ?? ''}
                    onChange={(evento) => setExtraido({ ...extraido, ano: Number(evento.target.value) })}
                  />
                </CampoFormulario>
              </div>
            )}

            {extraido && (
              <EditorEstruturaEdital
                conteudo={extraido}
                totalPaginas={detalhe.totalPaginas}
                disabled={operando !== null || detalhe.status === 'APROVADO' || detalhe.status === 'REJEITADO'}
                onChange={setExtraido}
              />
            )}

            {extraido && extraido.concursos.length > 0 && (
              <>
                <h3 className="font-semibold">Concursos e cargos</h3>
                <ul className="flex flex-col gap-2 text-sm [&_ul]:mt-1 [&_ul]:ml-4 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:text-muted-foreground">
                  {extraido.concursos.map((concurso, indice) => (
                    <li key={`${concurso.nome}-${indice}`}>
                      <strong>{concurso.nome}</strong>
                      <ul>
                        {concurso.cargos.map((cargo, indiceCargo) => (
                          <li key={`${cargo.nome}-${indiceCargo}`}>{cargo.nome}</li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {errosDeValidacao.length > 0 && (
              <Aviso tipo="erro">
                <ul className="list-disc space-y-1 pl-4 [&_code]:rounded [&_code]:bg-destructive/10 [&_code]:px-1 [&_code]:font-mono [&_code]:text-xs">
                  {errosDeValidacao.map((erro, indice) => (
                    <li key={`${erro.campo}-${indice}`}>
                      <code>{erro.campo}</code>: {erro.mensagem}
                    </li>
                  ))}
                </ul>
              </Aviso>
            )}

            <div className="flex flex-col gap-2 border-t pt-5 sm:flex-row sm:flex-wrap">
              {detalhe.status === 'AGUARDANDO_REVISAO' && (
                <>
                  <Botao
                    type="button"
                    variante="secundario"
                    carregando={operando === detalhe.id}
                    onClick={() => void agir(
                      estruturarLocalmenteImportacao,
                      detalhe.id,
                      'Estrutura sugerida a partir do texto do PDF. Revise antes de aprovar.',
                    )}
                  >
                    Ler PDF automaticamente
                  </Botao>
                  <Botao
                    type="button"
                    variante="secundario"
                    carregando={operando === detalhe.id}
                    onClick={() => void salvarRevisao()}
                  >
                    Salvar alterações
                  </Botao>
                  <Botao
                    type="button"
                    carregando={operando === detalhe.id}
                    onClick={() =>
                      void agir(
                        aprovarImportacao,
                        detalhe.id,
                        'Edital aprovado e disponível para o planner.',
                      )
                    }
                  >
                    Aprovar
                  </Botao>
                  <Botao
                    type="button"
                    variante="secundario"
                    carregando={operando === detalhe.id}
                    onClick={() => void agir(rejeitarImportacao, detalhe.id, 'Importação rejeitada.')}
                  >
                    Rejeitar
                  </Botao>
                </>
              )}

              {detalhe.status === 'FALHA' && (
                <>
                  <Botao
                    type="button"
                    variante="secundario"
                    carregando={operando === detalhe.id}
                    onClick={() => void agir(
                      estruturarLocalmenteImportacao,
                      detalhe.id,
                      'Estrutura sugerida a partir do texto do PDF. Revise antes de aprovar.',
                    )}
                  >
                    Ler PDF automaticamente
                  </Botao>
                  {extraido && (
                    <Botao type="button" carregando={operando === detalhe.id} onClick={() => void salvarRevisao()}>
                      Salvar alterações
                    </Botao>
                  )}
                  <Botao
                    type="button"
                    carregando={operando === detalhe.id}
                    onClick={() =>
                      void agir(reprocessarImportacao, detalhe.id, 'Extração reprocessada.')
                    }
                  >
                    Reprocessar
                  </Botao>
                  <Botao
                    type="button"
                    variante="secundario"
                    carregando={operando === detalhe.id}
                    onClick={() => void agir(rejeitarImportacao, detalhe.id, 'Importação rejeitada.')}
                  >
                    Rejeitar
                  </Botao>
                </>
              )}

              <Botao type="button" variante="secundario" onClick={() => void baixar(detalhe.nomeArquivo)}>
                Baixar PDF
              </Botao>
              <Botao
                type="button"
                variante="secundario"
                carregando={excluindo === detalhe.id}
                onClick={() => void excluirImportacaoSelecionada(detalhe.id, detalhe.nomeArquivo)}
              >
                Excluir
              </Botao>
            </div>
          </section>
        )}

        <CursosPublicados
          token={token}
          importacoes={importacoes}
          onExcluido={cursoExcluido}
          onEncerrarSessao={onEncerrarSessao}
        />

    </Conteudo>
  )
}

export default TelaImportarEdital
