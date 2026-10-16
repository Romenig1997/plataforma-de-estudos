import { beforeEach, describe, expect, it } from 'vitest'

import {
  aprovarImportacao,
  baixarPdfDoEdital,
  buscarImportacao,
  importarPDF,
  listarEditaisAprovados,
  listarImportacoes,
  rejeitarImportacao,
  reprocessarImportacao,
  revisarConteudo,
  type ConteudoExtraido,
} from './editais'
import { ErroDeApi, ErroDeRede, SessaoEncerrada } from './sessao'
import { corpoEnviado, instalarFetch, respostaJson } from './testes/ajuda'

/**
 * Contrato HTTP do modulo de editais (HU07, incremento A).
 *
 * <p>Mesma abordagem de `sessao.test.ts`/`perfil.test.ts`: um `fetch` falso por
 * teste para conferir URL, metodo, cabecalho e corpo - e os tres erros tipados.
 * O upload e o unico caso que NÃO envia JSON: monta `FormData` (multipart).
 */
describe('editais', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  const TOKEN = 'token-da-sessao'

  const IMPORTACAO = {
    id: 10,
    status: 'AGUARDANDO_REVISAO',
    totalPaginas: 2,
    conteudoEmJson: null,
    errosEmJson: null,
    nomeArquivo: 'edital.pdf',
    sha256: 'abc123',
    criadoEm: '2026-10-13T10:00:00Z',
    atualizadoEm: '2026-10-13T10:00:00Z',
  }

  const CONTEUDO: ConteudoExtraido = {
    titulo: 'Concurso Publico Exemplo',
    orgao: 'Prefeitura de Exemplo',
    ano: 2026,
    concursos: [{ nome: 'Concurso Unico', cargos: [{ nome: 'Professor' }] }],
    disciplinas: [
      {
        nome: 'Lingua Portuguesa',
        pagina: 1,
        assuntos: [
          {
            nome: 'Interpretacao de texto',
            pagina: 1,
            subassuntos: [{ nome: 'Generos textuais', pagina: 1 }],
          },
        ],
      },
    ],
  }

  // -----------------------------------------------------------------------
  // Listagem
  // -----------------------------------------------------------------------
  it('listarImportacoes pede o recurso com o token no cabecalho', async () => {
    const fetchFalso = instalarFetch(() => respostaJson(200, [IMPORTACAO]))

    const importacoes = await listarImportacoes(TOKEN)

    expect(importacoes).toEqual([IMPORTACAO])
    expect(String(fetchFalso.mock.calls[0][0])).toBe('/api/admin/editais/importacoes')
    expect(new Headers(fetchFalso.mock.calls[0][1]?.headers).get('Authorization')).toBe(
      `Bearer ${TOKEN}`,
    )
  })

  it('listarImportacoes traduz 401 em sessao encerrada', async () => {
    instalarFetch(() =>
      respostaJson(401, {
        erros: [{ campo: 'autenticacao', mensagem: 'Faca login para acessar este recurso.' }],
      }),
    )

    await expect(listarImportacoes(TOKEN)).rejects.toBeInstanceOf(SessaoEncerrada)
  })

  // -----------------------------------------------------------------------
  // Upload (multipart)
  // -----------------------------------------------------------------------
  it('importarPDF envia o arquivo em multipart sem Content-Type manual', async () => {
    const fetchFalso = instalarFetch(() => respostaJson(201, IMPORTACAO))

    const arquivo = new File(['conteudo'], 'edital.pdf', { type: 'application/pdf' })
    const criada = await importarPDF(TOKEN, arquivo)

    expect(criada).toEqual(IMPORTACAO)
    const [url, init] = fetchFalso.mock.calls[0]
    expect(String(url)).toBe('/api/admin/editais/importacoes')
    expect(init?.method).toBe('POST')
    expect(init?.body).toBeInstanceOf(FormData)
    expect(new Headers(init?.headers).get('Authorization')).toBe(`Bearer ${TOKEN}`)
    expect(new Headers(init?.headers).get('Content-Type')).toBeNull()
  })

  it('importarPDF traduz 409 do SHA-256 em ErroDeApi com o campo arquivo', async () => {
    instalarFetch(() =>
      respostaJson(409, {
        erros: [{ campo: 'arquivo', mensagem: 'Este PDF ja foi importado.' }],
      }),
    )

    const falha = await importarPDF(TOKEN, new File(['x'], 'edital.pdf')).catch(
      (erro: unknown) => erro,
    )

    expect(falha).toBeInstanceOf(ErroDeApi)
    expect((falha as ErroDeApi).status).toBe(409)
    expect((falha as ErroDeApi).mensagemDoCampo('arquivo')).toBe('Este PDF ja foi importado.')
  })

  it('importarPDF traduz falha de rede em ErroDeRede', async () => {
    instalarFetch(() => {
      throw new TypeError('Failed to fetch')
    })

    await expect(importarPDF(TOKEN, new File(['x'], 'edital.pdf'))).rejects.toBeInstanceOf(
      ErroDeRede,
    )
  })

  // -----------------------------------------------------------------------
  // Revisao, aprovacao, rejeicao e reprocessamento
  // -----------------------------------------------------------------------
  it('buscarImportacao pede o id da importacao', async () => {
    const fetchFalso = instalarFetch(() => respostaJson(200, IMPORTACAO))

    await buscarImportacao(TOKEN, 10)

    expect(String(fetchFalso.mock.calls[0][0])).toBe('/api/admin/editais/importacoes/10')
  })

  it('revisarConteudo envia PUT com o JSON extraido', async () => {
    const fetchFalso = instalarFetch(() =>
      respostaJson(200, { ...IMPORTACAO, conteudoEmJson: JSON.stringify(CONTEUDO) }),
    )

    await revisarConteudo(TOKEN, 10, CONTEUDO)

    const [url, init] = fetchFalso.mock.calls[0]
    expect(String(url)).toBe('/api/admin/editais/importacoes/10/conteudo')
    expect(init?.method).toBe('PUT')
    expect(corpoEnviado({ url: String(url), init })).toEqual(CONTEUDO)
    expect(new Headers(init?.headers).get('Authorization')).toBe(`Bearer ${TOKEN}`)
  })

  it('aprovarImportacao e um POST sem corpo', async () => {
    const fetchFalso = instalarFetch(() =>
      respostaJson(200, { ...IMPORTACAO, status: 'APROVADO' }),
    )

    await aprovarImportacao(TOKEN, 10)

    const [url, init] = fetchFalso.mock.calls[0]
    expect(String(url)).toBe('/api/admin/editais/importacoes/10/aprovar')
    expect(init?.method).toBe('POST')
    expect(init?.body).toBeUndefined()
  })

  it('rejeitarImportacao e reprocessarImportacao apontam as rotas certas', async () => {
    const rejeitar = instalarFetch(() => respostaJson(200, IMPORTACAO))

    await rejeitarImportacao(TOKEN, 10)
    expect(String(rejeitar.mock.calls[0][0])).toBe('/api/admin/editais/importacoes/10/rejeitar')

    const reprocessar = instalarFetch(() => respostaJson(200, IMPORTACAO))
    await reprocessarImportacao(TOKEN, 10)
    expect(String(reprocessar.mock.calls[0][0])).toBe(
      '/api/admin/editais/importacoes/10/reprocessar',
    )
  })

  // -----------------------------------------------------------------------
  // Catalogo de editais aprovados
  // -----------------------------------------------------------------------
  it('listarEditaisAprovados le o catalogo publico autenticado', async () => {
    const fetchFalso = instalarFetch(() =>
      respostaJson(200, [
        { id: 1, titulo: 'Concurso A', orgao: 'Prefeitura', ano: 2026, criadoEm: 'x', disciplinas: [], concursos: [] },
      ]),
    )

    const editais = await listarEditaisAprovados(TOKEN)

    expect(editais).toHaveLength(1)
    expect(String(fetchFalso.mock.calls[0][0])).toBe('/api/editais')
    expect(new Headers(fetchFalso.mock.calls[0][1]?.headers).get('Authorization')).toBe(
      `Bearer ${TOKEN}`,
    )
  })

  it('baixarPdfDoEdital pede o PDF do curso com o token da sessão', async () => {
    const pdf = new Blob(['%PDF-teste'], { type: 'application/pdf' })
    const fetchFalso = instalarFetch(() => ({ ok: true, status: 200, blob: async () => pdf } as Response))

    await expect(baixarPdfDoEdital(TOKEN, 42)).resolves.toBe(pdf)

    expect(String(fetchFalso.mock.calls[0][0])).toBe('/api/editais/42/pdf')
    expect(new Headers(fetchFalso.mock.calls[0][1]?.headers).get('Authorization')).toBe(`Bearer ${TOKEN}`)
  })
})
