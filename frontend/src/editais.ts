/**
 * Editais (HU07, incremento A): importacao de PDF, revisao/aprovacao pelo
 * ADMIN e o catalogo de editais aprovados que o planner le.
 *
 * <p>Mesmo contrato de `sessao.ts`/`admin.ts`: token no cabecalho
 * `Authorization` e os mesmos tres erros tipados. O upload envia
 * `multipart/form-data` (o navegador monta o boundary), a revisao envia o
 * JSON extraido pela IA e a aprovacao/rejeicao sao POSTs sem corpo.
 */
import { requisitar, requisitarJson } from './api'
import type { ErroDeCampo } from './sessao'

export type StatusDeImportacao =
  | 'AGUARDANDO_EXTRACAO'
  | 'AGUARDANDO_REVISAO'
  | 'FALHA'
  | 'APROVADO'
  | 'REJEITADO'

export type ImportacaoDeEdital = {
  id: number
  status: StatusDeImportacao
  totalPaginas: number
  conteudoEmJson: string | null
  errosEmJson: string | null
  nomeArquivo: string
  sha256: string
  criadoEm: string
  atualizadoEm: string
  /** Curso criado por esta importacao, quando aprovada. */
  editalAprovadoId?: number | null
}

/** A arvore que a IA extrai do PDF - o contrato de revisao (EditalExtraido). */
export type ConteudoExtraido = {
  titulo: string
  orgao: string
  ano: number
  concursos: { nome: string; cargos: { nome: string }[] }[]
  disciplinas: {
    nome: string
    pagina: number
    assuntos: {
      nome: string
      pagina: number
      subassuntos: { nome: string; pagina: number }[]
    }[]
  }[]
}

/** Confere o formato do arquivo local antes de renderizar a arvore. */
export function lerEstruturaRevisada(texto: string): ConteudoExtraido {
  const objeto = (valor: unknown): valor is Record<string, unknown> =>
    valor !== null && typeof valor === 'object' && !Array.isArray(valor)
  const item = (valor: unknown): valor is Record<string, unknown> =>
    objeto(valor) && typeof valor.nome === 'string' && typeof valor.pagina === 'number'
  const lista = (valor: unknown, aceita: (item: unknown) => boolean) =>
    Array.isArray(valor) && valor.every(aceita)
  const raiz: unknown = JSON.parse(texto)
  if (!objeto(raiz) || typeof raiz.titulo !== 'string' || typeof raiz.orgao !== 'string'
      || typeof raiz.ano !== 'number'
      || !lista(raiz.concursos, concurso => objeto(concurso) && typeof concurso.nome === 'string'
        && lista(concurso.cargos, cargo => objeto(cargo) && typeof cargo.nome === 'string'))
      || !lista(raiz.disciplinas, disciplina => item(disciplina)
        && lista(disciplina.assuntos, assunto => item(assunto) && lista(assunto.subassuntos, item)))) {
    throw new Error('Estrutura inválida. Use o arquivo de revisão preparado para este edital.')
  }
  return raiz as ConteudoExtraido
}

export type ConteudoAprovado = { id: number; nome: string; pagina: number; subassuntos: ConteudoAprovado[] }

export type EditalAprovado = {
  id: number
  titulo: string
  orgao: string
  ano: number
  criadoEm: string
  materialPdfUrl: string | null
  possuiPdfOriginal: boolean
  disciplinas: {
    id: number
    nome: string
    pagina: number
    assuntos: ConteudoAprovado[]
  }[]
  concursos: { id: number; nome: string; cargos: { id: number; nome: string }[] }[]
}

const IMPORTACOES = '/api/admin/editais/importacoes'

export const listarImportacoes = (token: string) => requisitarJson<ImportacaoDeEdital[]>(IMPORTACOES, token)

/** Faz o upload do PDF e dispara a extracao. {@link ErroDeApi} em 400/409. */
export async function importarPDF(token: string, arquivo: File): Promise<ImportacaoDeEdital> {
  const formulario = new FormData()
  formulario.append('arquivo', arquivo)
  return requisitarJson<ImportacaoDeEdital>(IMPORTACOES, token, { metodo: 'POST', formulario })
}

export const buscarImportacao = (token: string, id: number) =>
  requisitarJson<ImportacaoDeEdital>(`${IMPORTACOES}/${id}`, token)

/** Salva o JSON extraido editado e revalida a arvore (erros vao em `errosEmJson`). */
export const revisarConteudo = (token: string, id: number, conteudo: ConteudoExtraido) =>
  requisitarJson<ImportacaoDeEdital>(`${IMPORTACOES}/${id}/conteudo`, token, { metodo: 'PUT', json: conteudo })

export const aprovarImportacao = (token: string, id: number) =>
  requisitarJson<ImportacaoDeEdital>(`${IMPORTACOES}/${id}/aprovar`, token, { metodo: 'POST' })

export const rejeitarImportacao = (token: string, id: number) =>
  requisitarJson<ImportacaoDeEdital>(`${IMPORTACOES}/${id}/rejeitar`, token, { metodo: 'POST' })

export const reprocessarImportacao = (token: string, id: number) =>
  requisitarJson<ImportacaoDeEdital>(`${IMPORTACOES}/${id}/reprocessar`, token, { metodo: 'POST' })

/** Relê o texto do PDF no backend, com regras locais e sem chamar IA externa. */
export const estruturarLocalmenteImportacao = (token: string, id: number) =>
  requisitarJson<ImportacaoDeEdital>(`${IMPORTACOES}/${id}/estruturar-localmente`, token, { metodo: 'POST' })

/** Baixa o PDF original da importacao (URL com blob, pois o header de auth nao acompanha <a href>). */
export async function baixarPdf(token: string, id: number): Promise<Blob> {
  const resposta = await requisitar(`${IMPORTACOES}/${id}/pdf`, token)
  return resposta.blob()
}

export const listarEditaisAprovados = (token: string) => requisitarJson<EditalAprovado[]>('/api/editais', token)

/** Lê o PDF original com autenticação para abri-lo dentro do curso. */
export async function baixarPdfDoEdital(token: string, editalId: number): Promise<Blob> {
  const resposta = await requisitar(`/api/editais/${editalId}/pdf`, token)
  return resposta.blob()
}

export async function excluirImportacao(token: string, id: number): Promise<void> {
  await requisitar(`${IMPORTACOES}/${id}`, token, { metodo: 'DELETE' })
}

/** Exclui o curso pelo id do edital (ADMIN), mesmo sem importacao ligada. */
export async function excluirEdital(token: string, editalId: number): Promise<void> {
  await requisitar(`/api/admin/editais/${editalId}`, token, { metodo: 'DELETE' })
}

export type { ErroDeCampo }
