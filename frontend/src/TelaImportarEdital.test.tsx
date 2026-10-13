import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import TelaImportarEdital from './TelaImportarEdital'
import type { ImportacaoDeEdital } from './editais'
import { respostaJson } from './testes/ajuda'

/**
 * Tela de importacao de editais (HU07, incremento A).
 *
 * <p>A tela so mostra a tabela e o painel de revisao com a API (prop `token`);
 * aqui o `fetch` e fake por rota, como nos testes das outras telas. O fluxo
 * principal: upload -> revisao -> aprovacao. E os erros: 401 encerra a sessao,
 * e 409 do hash aparece no campo do formulario.
 */

const TOKEN = 'token-do-admin'

const IMPORTACAO: ImportacaoDeEdital = {
  id: 10,
  status: 'AGUARDANDO_REVISAO',
  totalPaginas: 2,
  nomeArquivo: 'concurso-exemplo.pdf',
  sha256: 'abc123',
  criadoEm: '2026-10-13T10:00:00Z',
  atualizadoEm: '2026-10-13T10:00:00Z',
  conteudoEmJson: JSON.stringify({
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
  }),
  errosEmJson: null,
}

/** Roteia o fetch por URL: cada caminho responde o que o teste decidiu. */
function instalarApi(respostas: { [url: string]: Response }) {
  const fetchFalso = vi.fn((entrada: string | URL, init?: RequestInit) => {
    const url = String(entrada)
    const resposta = respostas[url]
    if (!resposta) {
      console.error('URL nao configurada:', url, String(init?.method ?? 'GET'))
      throw new Error(`Sem resposta configurada para ${url}`)
    }
    return Promise.resolve(resposta)
  })
  vi.stubGlobal('fetch', fetchFalso)
  return fetchFalso
}

/** O upload e um POST no mesmo caminho da lista (GET) - roteia pelo metodo. */
function instalarApiDeUploads(): ReturnType<typeof vi.fn> {
  const fetchFalso = vi.fn((entrada: string | URL, init?: RequestInit) => {
    const url = String(entrada)
    if (url === '/api/admin/editais/importacoes') {
      return Promise.resolve(
        init?.method === 'POST' ? respostaJson(201, IMPORTACAO) : respostaJson(200, []),
      )
    }
    if (url === '/api/admin/editais/importacoes/10') {
      return Promise.resolve(respostaJson(200, IMPORTACAO))
    }
    throw new Error(`Sem resposta configurada para ${url} (${String(init?.method ?? 'GET')})`)
  })
  vi.stubGlobal('fetch', fetchFalso)
  return fetchFalso
}

function blobDaResposta(): Response {
  return {
    ok: true,
    status: 200,
    blob: async () => new Blob(['%PDF-fake'], { type: 'application/pdf' }),
  } as unknown as Response
}

const onVoltar = vi.fn()
const onEncerrarSessao = vi.fn()

beforeEach(() => {
  onVoltar.mockReset()
  onEncerrarSessao.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('TelaImportarEdital', () => {
  it('mostra o estado vazio quando ainda nao ha importacoes', async () => {
    instalarApi({ '/api/admin/editais/importacoes': respostaJson(200, []) })

    render(<TelaImportarEdital token={TOKEN} onVoltar={onVoltar} onEncerrarSessao={onEncerrarSessao} />)

    expect(await screen.findByText('Nenhuma importação até agora.')).toBeInTheDocument()
  })

  it('lista as importacoes com o status legivel', async () => {
    instalarApi({ '/api/admin/editais/importacoes': respostaJson(200, [IMPORTACAO]) })

    render(<TelaImportarEdital token={TOKEN} onVoltar={onVoltar} onEncerrarSessao={onEncerrarSessao} />)

    expect(await screen.findByText('concurso-exemplo.pdf')).toBeInTheDocument()
    expect(screen.getByText('Aguardando revisão')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('401 encerra a sessao com a mensagem padrao', async () => {
    instalarApi({
      '/api/admin/editais/importacoes': respostaJson(401, {
        erros: [{ campo: 'autenticacao', mensagem: 'Faca login.' }],
      }),
    })

    render(<TelaImportarEdital token={TOKEN} onVoltar={onVoltar} onEncerrarSessao={onEncerrarSessao} />)

    await waitPara(onEncerrarSessao)
    expect(onEncerrarSessao).toHaveBeenCalledWith('Sua sessão expirou. Faça login novamente.')
  })

  it('upload do PDF abre a revisao com a arvore extraida', async () => {
    const fetchFalso = instalarApiDeUploads()

    render(<TelaImportarEdital token={TOKEN} onVoltar={onVoltar} onEncerrarSessao={onEncerrarSessao} />)

    await screen.findByText('Nenhuma importação até agora.')

    const arquivo = new File(['%PDF-fake'], 'edital.pdf', { type: 'application/pdf' })
    await userEvent.upload(screen.getByLabelText('PDF do edital'), arquivo)
    await userEvent.click(screen.getByRole('button', { name: 'Importar edital' }))

    const painel = await screen.findByTestId('painel-de-revisao')
    expect(within(painel).getByText('Aguardando revisão')).toBeInTheDocument()
    expect(screen.getByLabelText('Título do edital')).toHaveValue('Concurso Publico Exemplo')

    const chamadasDeUpload = fetchFalso.mock.calls.filter(
      (chamada) => String(chamada[0]) === '/api/admin/editais/importacoes' && chamada[1]?.method === 'POST',
    )
    expect(chamadasDeUpload).toHaveLength(1)
    expect(chamadasDeUpload[0][1]?.body).toBeInstanceOf(FormData)
  })

  it('erro de 409 no upload aparece no formulario', async () => {
    instalarApi({
      '/api/admin/editais/importacoes': respostaJson(200, []),
      '/api/admin/editais/importacoes/10': respostaJson(200, IMPORTACAO),
    })
    let contaUploads = 0
    vi.stubGlobal(
      'fetch',
      vi.fn((entrada: string | URL, init?: RequestInit) => {
        const url = String(entrada)
        if (url === '/api/admin/editais/importacoes' && init?.method === 'POST') {
          contaUploads += 1
          if (contaUploads === 1) {
            return Promise.resolve(
              respostaJson(409, {
                erros: [{ campo: 'arquivo', mensagem: 'Este PDF ja foi importado.' }],
              }),
            )
          }
        }
        if (url === '/api/admin/editais/importacoes' && (init?.method === 'GET' || !init?.method)) {
          return Promise.resolve(respostaJson(200, []))
        }
        return Promise.resolve(respostaJson(200, IMPORTACAO))
      }),
    )

    render(<TelaImportarEdital token={TOKEN} onVoltar={onVoltar} onEncerrarSessao={onEncerrarSessao} />)

    await screen.findByText('Nenhuma importação até agora.')

    const arquivo = new File(['%PDF-fake'], 'edital.pdf', { type: 'application/pdf' })
    await userEvent.upload(screen.getByLabelText('PDF do edital'), arquivo)
    await userEvent.click(screen.getByRole('button', { name: 'Importar edital' }))

    expect(await screen.findByText('Este PDF ja foi importado.')).toBeInTheDocument()
  })

  it('revisao salva alteracoes e a aprovacao eh um POST sem corpo', async () => {
    const fetchFalso = instalarApi({
      '/api/admin/editais/importacoes': respostaJson(200, [IMPORTACAO]),
      '/api/admin/editais/importacoes/10': respostaJson(200, IMPORTACAO),
      '/api/admin/editais/importacoes/10/conteudo': respostaJson(200, IMPORTACAO),
      '/api/admin/editais/importacoes/10/aprovar': respostaJson(200, {
        ...IMPORTACAO,
        status: 'APROVADO',
      }),
    })

    render(<TelaImportarEdital token={TOKEN} onVoltar={onVoltar} onEncerrarSessao={onEncerrarSessao} />)

    await screen.findByText('concurso-exemplo.pdf')
    await userEvent.click(screen.getByRole('button', { name: 'Revisar' }))

    const titulo = await screen.findByLabelText('Título do edital')
    await userEvent.clear(titulo)
    await userEvent.type(titulo, 'Concurso Exemplo 2026')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByText('Revisão salva e revalidada.')).toBeInTheDocument()

    const corpo = JSON.parse(
      String(
        fetchFalso.mock.calls.find(
          (chamada) => String(chamada[0]) === '/api/admin/editais/importacoes/10/conteudo',
        )?.[1]?.body,
      ),
    ) as { titulo: string }
    expect(corpo.titulo).toBe('Concurso Exemplo 2026')

    await userEvent.click(screen.getByRole('button', { name: 'Aprovar' }))
    expect(await screen.findByText('Edital aprovado e disponível para o planner.')).toBeInTheDocument()

    const chamadaDeAprovacao = fetchFalso.mock.calls.find(
      (chamada) => String(chamada[0]) === '/api/admin/editais/importacoes/10/aprovar',
    )
    expect(chamadaDeAprovacao?.[1]?.method).toBe('POST')
    expect(onEncerrarSessao).not.toHaveBeenCalled()
  })

  it('erros de validacao da arvore aparecem na lista de erros', async () => {
    instalarApi({
      '/api/admin/editais/importacoes': respostaJson(200, [IMPORTACAO]),
      '/api/admin/editais/importacoes/10': respostaJson(200, {
        ...IMPORTACAO,
        errosEmJson: JSON.stringify([
          { campo: 'titulo', mensagem: 'O titulo deve ter pelo menos 10 caracteres.' },
          { campo: 'disciplinas', mensagem: 'Informe ao menos uma disciplina.' },
        ]),
      }),
    })

    render(<TelaImportarEdital token={TOKEN} onVoltar={onVoltar} onEncerrarSessao={onEncerrarSessao} />)

    await screen.findByText('concurso-exemplo.pdf')
    await userEvent.click(screen.getByRole('button', { name: 'Revisar' }))

    const erroDoTitulo = await screen.findByText('titulo', { selector: 'code' })
    expect(erroDoTitulo.parentElement).toHaveTextContent(
      'O titulo deve ter pelo menos 10 caracteres.',
    )

    const erroDasDisciplinas = screen.getByText('disciplinas', { selector: 'code' })
    expect(erroDasDisciplinas.parentElement).toHaveTextContent('Informe ao menos uma disciplina.')
  })

  it('Baixar PDF usa blob e dispara o download', async () => {
    const criaUrl = vi.fn(() => 'blob:edital')
    vi.stubGlobal('URL', { createObjectURL: criaUrl, revokeObjectURL: vi.fn() })

    const fetchFalso = instalarApi({
      '/api/admin/editais/importacoes': respostaJson(200, [IMPORTACAO]),
      '/api/admin/editais/importacoes/10/pdf': blobDaResposta(),
    })

    render(<TelaImportarEdital token={TOKEN} onVoltar={onVoltar} onEncerrarSessao={onEncerrarSessao} />)

    await screen.findByText('concurso-exemplo.pdf')
    const botaoDeBaixar = screen.getByRole('button', { name: 'Baixar PDF' })
    await userEvent.click(botaoDeBaixar)

    await waitPara(criaUrl)
    expect(criaUrl).toHaveBeenCalledTimes(1)
    const [url, init] = fetchFalso.mock.calls.find(
      (chamada) => String(chamada[0]) === '/api/admin/editais/importacoes/10/pdf',
    ) ?? [undefined, undefined]
    expect(String(url)).toBe('/api/admin/editais/importacoes/10/pdf')
    expect(new Headers(init?.headers).get('Authorization')).toBe(`Bearer ${TOKEN}`)
  })
})

/** Espera o callback ser chamado (equivalente a findBy com acao). */
function waitPara(espiao: ReturnType<typeof vi.fn>): Promise<void> {
  return new Promise((resolve) => {
    const vezes = setInterval(() => {
      if (espiao.mock.calls.length > 0) {
        clearInterval(vezes)
        resolve()
      }
    }, 10)
  })
}