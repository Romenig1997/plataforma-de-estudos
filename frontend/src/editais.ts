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
  /** Sigla da capa do card, gerada pelo orgao e editavel pelo admin. */
  sigla: string
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
  /** Nulo sem banner; muda a cada troca, o que renova a URL da imagem. */
  bannerVersao: number | null
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

/**
 * Como o leitor abre o PDF original: `STORAGE` traz uma URL assinada de curta
 * duracao do bucket privado; `LEGADO` (PDF antigo, guardado no banco) manda
 * baixar pelo endpoint autenticado.
 */
export type AcessoAoPdf = { origem: 'STORAGE' | 'LEGADO'; url: string | null; expiraEm: string | null }

export const acessarPdfDoEdital = (token: string, editalId: number) =>
  requisitarJson<AcessoAoPdf>(`/api/editais/${editalId}/pdf/acesso`, token)

/** Fallback dos PDFs legados: lê o arquivo com autenticação (cache privado de 30 dias). */
export async function baixarPdfDoEdital(token: string, editalId: number): Promise<Blob> {
  const resposta = await requisitar(`/api/editais/${editalId}/pdf`, token)
  return resposta.blob()
}

/** Endereço pronto para o iframe; `expiraEm` (ms) só existe nas URLs assinadas. */
export type PdfAberto = { url: string; expiraEm: number | null }

/**
 * Endereço do PDF original para o leitor do curso. PDFs no Storage abrem pela
 * URL assinada, direto do navegador para o Storage, sem passar o arquivo pelo
 * backend; os legados ainda são baixados como Blob.
 */
export async function abrirPdfDoEdital(token: string, editalId: number): Promise<PdfAberto> {
  const acesso = await acessarPdfDoEdital(token, editalId)
  if (acesso.origem === 'STORAGE' && acesso.url) {
    return { url: acesso.url, expiraEm: acesso.expiraEm ? Date.parse(acesso.expiraEm) : null }
  }
  return { url: URL.createObjectURL(await baixarPdfDoEdital(token, editalId)), expiraEm: null }
}

export async function excluirImportacao(token: string, id: number): Promise<void> {
  await requisitar(`${IMPORTACOES}/${id}`, token, { metodo: 'DELETE' })
}

/** URL publica do banner do card; a versao evita mostrar o banner antigo do cache. */
export const urlDoBanner = (editalId: number, versao: number) => `/api/editais/${editalId}/banner?v=${versao}`

/** Envia ou troca o banner do card do curso (ADMIN) e devolve a nova versao. */
export async function salvarBanner(token: string, editalId: number, arquivo: File): Promise<number> {
  const formulario = new FormData()
  formulario.append('arquivo', arquivo)
  const resposta = await requisitar(`/api/admin/editais/${editalId}/banner`, token, { metodo: 'POST', formulario })
  const { bannerVersao } = (await resposta.json()) as { bannerVersao: number }
  return bannerVersao
}

export async function removerBanner(token: string, editalId: number): Promise<void> {
  await requisitar(`/api/admin/editais/${editalId}/banner`, token, { metodo: 'DELETE' })
}

/** Edita o nome e a sigla do orgao exibidos no card (ADMIN). */
export const atualizarOrgao = (token: string, editalId: number, orgao: string, sigla: string) =>
  requisitarJson<EditalAprovado>(`/api/admin/editais/${editalId}/orgao`, token, { metodo: 'PUT', json: { orgao, sigla } })

/** Exclui o curso pelo id do edital (ADMIN), mesmo sem importacao ligada. */
export async function excluirEdital(token: string, editalId: number): Promise<void> {
  await requisitar(`/api/admin/editais/${editalId}`, token, { metodo: 'DELETE' })
}

/*
 * Estrutura do curso publicado (ADMIN). Cada operacao devolve o curso
 * atualizado. Excluir apaga do banco o progresso, as questoes e as
 * atividades do cronograma ligadas ao item.
 */
const estrutura = (editalId: number) => `/api/admin/editais/${editalId}`

export const adicionarDisciplina = (token: string, editalId: number, nome: string, primeiroAssunto: string) =>
  requisitarJson<EditalAprovado>(`${estrutura(editalId)}/disciplinas`, token, { metodo: 'POST', json: { nome, primeiroAssunto } })

export const renomearDisciplina = (token: string, editalId: number, disciplinaId: number, nome: string) =>
  requisitarJson<EditalAprovado>(`${estrutura(editalId)}/disciplinas/${disciplinaId}`, token, { metodo: 'PUT', json: { nome } })

export const excluirDisciplina = (token: string, editalId: number, disciplinaId: number) =>
  requisitarJson<EditalAprovado>(`${estrutura(editalId)}/disciplinas/${disciplinaId}`, token, { metodo: 'DELETE' })

/** Assunto quando `paiId` e nulo; subassunto dentro do assunto `paiId`. */
export const adicionarConteudo = (token: string, editalId: number, disciplinaId: number, nome: string, paiId: number | null) =>
  requisitarJson<EditalAprovado>(`${estrutura(editalId)}/disciplinas/${disciplinaId}/conteudos`, token, { metodo: 'POST', json: { nome, paiId } })

export const renomearConteudo = (token: string, editalId: number, conteudoId: number, nome: string) =>
  requisitarJson<EditalAprovado>(`${estrutura(editalId)}/conteudos/${conteudoId}`, token, { metodo: 'PUT', json: { nome } })

export const excluirConteudo = (token: string, editalId: number, conteudoId: number) =>
  requisitarJson<EditalAprovado>(`${estrutura(editalId)}/conteudos/${conteudoId}`, token, { metodo: 'DELETE' })

export type { ErroDeCampo }
