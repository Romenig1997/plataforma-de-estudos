/**
 * Editais (HU07, incremento A): importacao de PDF, revisao/aprovacao pelo
 * ADMIN e o catalogo de editais aprovados que o planner le.
 *
 * <p>Mesmo contrato de `sessao.ts`/`admin.ts`: token no cabecalho
 * `Authorization` e os mesmos tres erros tipados. O upload envia
 * `multipart/form-data` (o navegador monta o boundary), a revisao envia o
 * JSON extraido pela IA e a aprovacao/rejeicao sao POSTs sem corpo.
 */
import {
  ErroDeApi,
  ErroDeRede,
  SessaoEncerrada,
  lerErros,
  type ErroDeCampo,
} from './sessao'

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

export type EditalAprovado = {
  id: number
  titulo: string
  orgao: string
  ano: number
  criadoEm: string
  disciplinas: {
    id: number
    nome: string
    pagina: number
    assuntos: { id: number; nome: string; pagina: number; subassuntos: unknown[] }[]
  }[]
  concursos: { id: number; nome: string; cargos: { id: number; nome: string }[] }[]
}

/** 401 vira sessao encerrada; o resto vira erro de API com os erros por campo. */
async function falhaDaResposta(resposta: Response): Promise<ErroDeApi | SessaoEncerrada> {
  if (resposta.status === 401) {
    return new SessaoEncerrada()
  }
  return new ErroDeApi(resposta.status, await lerErros(resposta))
}

export async function listarImportacoes(token: string): Promise<ImportacaoDeEdital[]> {
  return requisicaoJson('/api/admin/editais/importacoes', token) as Promise<ImportacaoDeEdital[]>
}

/** Faz o upload do PDF e dispara a extracao. {@link ErroDeApi} em 400/409. */
export async function importarPDF(token: string, arquivo: File): Promise<ImportacaoDeEdital> {
  const formulario = new FormData()
  formulario.append('arquivo', arquivo)

  let resposta: Response
  try {
    resposta = await fetch('/api/admin/editais/importacoes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formulario,
    })
  } catch {
    throw new ErroDeRede()
  }

  if (!resposta.ok) {
    throw await falhaDaResposta(resposta)
  }

  return (await resposta.json()) as ImportacaoDeEdital
}

export async function buscarImportacao(token: string, id: number): Promise<ImportacaoDeEdital> {
  return requisicaoJson(`/api/admin/editais/importacoes/${id}`, token) as Promise<ImportacaoDeEdital>
}

/** Salva o JSON extraido editado e revalida a arvore (erros vao em `errosEmJson`). */
export async function revisarConteudo(
  token: string,
  id: number,
  conteudo: ConteudoExtraido,
): Promise<ImportacaoDeEdital> {
  return requisicaoJson(`/api/admin/editais/importacoes/${id}/conteudo`, token, {
    method: 'PUT',
    body: JSON.stringify(conteudo),
  }) as Promise<ImportacaoDeEdital>
}

export async function aprovarImportacao(token: string, id: number): Promise<ImportacaoDeEdital> {
  return requisicaoJson(`/api/admin/editais/importacoes/${id}/aprovar`, token, {
    method: 'POST',
  }) as Promise<ImportacaoDeEdital>
}

export async function rejeitarImportacao(token: string, id: number): Promise<ImportacaoDeEdital> {
  return requisicaoJson(`/api/admin/editais/importacoes/${id}/rejeitar`, token, {
    method: 'POST',
  }) as Promise<ImportacaoDeEdital>
}

export async function reprocessarImportacao(
  token: string,
  id: number,
): Promise<ImportacaoDeEdital> {
  return requisicaoJson(`/api/admin/editais/importacoes/${id}/reprocessar`, token, {
    method: 'POST',
  }) as Promise<ImportacaoDeEdital>
}

/** Baixa o PDF original da importacao (URL com blob, pois o header de auth nao acompanha <a href>). */
export async function baixarPdf(token: string, id: number): Promise<Blob> {
  let resposta: Response

  try {
    resposta = await fetch(`/api/admin/editais/importacoes/${id}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    throw new ErroDeRede()
  }

  if (!resposta.ok) {
    throw await falhaDaResposta(resposta)
  }

  return resposta.blob()
}

export async function listarEditaisAprovados(token: string): Promise<EditalAprovado[]> {
  return requisicaoJson('/api/editais', token) as Promise<EditalAprovado[]>
}

/** GET/PUT/POST autenticados com o token no cabecalho. */
async function requisicaoJson(
  url: string,
  token: string,
  init?: { method?: string; body?: string },
): Promise<unknown> {
  let resposta: Response

  try {
    resposta = await fetch(url, {
      method: init?.method ?? 'GET',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: init?.body,
    })
  } catch {
    throw new ErroDeRede()
  }

  if (!resposta.ok) {
    throw await falhaDaResposta(resposta)
  }

  return await resposta.json()
}

export type { ErroDeCampo }