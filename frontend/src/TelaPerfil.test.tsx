import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import TelaPerfil from './TelaPerfil'
import { corpoEnviado, instalarFetch, respostaJson } from './testes/ajuda'

/**
 * Criterios de aceite da tela de perfil (HU03).
 *
 * Cada teste monta a tela com um `fetch` falso que responde o cenario
 * descrito, edita o formulario como uma pessoa e confere o que aparece e o
 * que foi enviado para a API.
 */
describe('TelaPerfil', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  const TOKEN = 'token-da-sessao'

  const PERFIL = {
    id: 7,
    nome: 'Ana Souza',
    email: 'ana@email.com',
    metaEstudoSemanal: 10,
    objetivoMotivacao: 'Passar no concurso da Receita Federal',
  }

  /**
   * Backend com GET e PUT de perfil funcionando. `sobrescrever` permite que
   * um teste altere a resposta do PUT sem repetir o roteiro inteiro.
   */
  function instalarBackend(sobrescrever?: () => Response) {
    return instalarFetch(({ url, init }) => {
      if (url === '/api/perfil' && !init?.method) {
        return respostaJson(200, PERFIL)
      }
      if (url === '/api/perfil' && init?.method === 'PUT') {
        return sobrescrever ? sobrescrever() : respostaJson(200, PERFIL)
      }
      throw new Error(`URL inesperada no teste: ${url}`)
    })
  }

  /** Monta a tela ja com o perfil carregado e devolve os duplos do teste. */
  async function montarEPreencher() {
    const fetchFalso = instalarBackend()
    const onVoltar = vi.fn()
    render(<TelaPerfil token={TOKEN} onEncerrarSessao={vi.fn()} onVoltar={onVoltar} />)
    await screen.findByLabelText('Nome completo')
    return { fetchFalso, onVoltar }
  }

  // -----------------------------------------------------------------------
  // 1. Leitura do perfil
  // -----------------------------------------------------------------------
  it('carrega o perfil e preenche o formulario com os dados da API', async () => {
    const { fetchFalso } = await montarEPreencher()

    expect(screen.getByLabelText('Nome completo')).toHaveValue('Ana Souza')
    expect(screen.getByLabelText('E-mail')).toHaveValue('ana@email.com')
    expect(screen.getByLabelText('Meta de estudo semanal (horas)')).toHaveValue(10)
    expect(screen.getByLabelText('Objetivo / motivação')).toHaveValue(
      'Passar no concurso da Receita Federal',
    )

    // A leitura foi autenticada.
    expect(String(fetchFalso.mock.calls[0][0])).toBe('/api/perfil')
    expect(new Headers(fetchFalso.mock.calls[0][1]?.headers).get('Authorization')).toBe(
      `Bearer ${TOKEN}`,
    )
  })

  it('trata campos opcionais vazios como string vazia no formulario', async () => {
    instalarFetch(({ url, init }) => {
      if (url === '/api/perfil' && !init?.method) {
        return respostaJson(200, {
          ...PERFIL,
          metaEstudoSemanal: null,
          objetivoMotivacao: null,
        })
      }
      throw new Error(`URL inesperada no teste: ${url}`)
    })

    render(<TelaPerfil token={TOKEN} onEncerrarSessao={vi.fn()} onVoltar={vi.fn()} />)

    expect(await screen.findByLabelText('Nome completo')).toHaveValue('Ana Souza')
    // `toHaveValue` normaliza input numerico vazio para null; o valor cru do
    // DOM e a string vazia, que e o que o formulario guarda.
    expect(
      (screen.getByLabelText('Meta de estudo semanal (horas)') as HTMLInputElement).value,
    ).toBe('')
    expect(screen.getByLabelText('Objetivo / motivação')).toHaveValue('')
  })

  it('mostra estado de carregamento e erro quando a API de leitura falha', async () => {
    instalarFetch(() => {
      throw new TypeError('Failed to fetch')
    })

    render(<TelaPerfil token={TOKEN} onEncerrarSessao={vi.fn()} onVoltar={vi.fn()} />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Não foi possível conectar ao servidor/,
    )
    // O formulario so aparece depois que o perfil carrega.
    expect(screen.queryByLabelText('Nome completo')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
  })

  // -----------------------------------------------------------------------
  // 2. Atualizacao valida
  // -----------------------------------------------------------------------
  it('salva as alteracoes e mostra confirmacao de sucesso', async () => {
    const { fetchFalso } = await montarEPreencher()

    const usuario = userEvent.setup()
    await usuario.clear(screen.getByLabelText('Nome completo'))
    await usuario.type(screen.getByLabelText('Nome completo'), 'Ana Paula Souza')
    await usuario.clear(screen.getByLabelText('Meta de estudo semanal (horas)'))
    await usuario.type(screen.getByLabelText('Meta de estudo semanal (horas)'), '20')
    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByText('Perfil atualizado com sucesso.')).toBeInTheDocument()

    const chamadaDeSalvamento = fetchFalso.mock.calls.find(
      (chamada) => chamada[1]?.method === 'PUT',
    )
    expect(chamadaDeSalvamento).toBeDefined()
    expect(new Headers(chamadaDeSalvamento?.[1]?.headers).get('Authorization')).toBe(
      `Bearer ${TOKEN}`,
    )
    expect(
      corpoEnviado({ url: '/api/perfil', init: chamadaDeSalvamento?.[1] }),
    ).toEqual({
      nome: 'Ana Paula Souza',
      email: 'ana@email.com',
      metaEstudoSemanal: 20,
      objetivoMotivacao: 'Passar no concurso da Receita Federal',
    })
  })

  it('envia null para os campos opcionais deixados em branco', async () => {
    const { fetchFalso } = await montarEPreencher()

    const usuario = userEvent.setup()
    await usuario.clear(screen.getByLabelText('Meta de estudo semanal (horas)'))
    await usuario.clear(screen.getByLabelText('Objetivo / motivação'))
    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    await screen.findByText('Perfil atualizado com sucesso.')

    const chamadaDeSalvamento = fetchFalso.mock.calls.find(
      (chamada) => chamada[1]?.method === 'PUT',
    )
    const corpo = corpoEnviado({ url: '/api/perfil', init: chamadaDeSalvamento?.[1] })
    expect(corpo.metaEstudoSemanal).toBeNull()
    expect(corpo.objetivoMotivacao).toBeNull()
  })

  it('mostra o estado de salvamento enquanto a API responde', async () => {
    let resolver: ((resposta: Response) => void) | undefined
    instalarFetch(({ url, init }) => {
      if (url === '/api/perfil' && !init?.method) {
        return respostaJson(200, PERFIL)
      }
      return new Promise<Response>((aceitar) => {
        resolver = aceitar
      })
    })

    render(<TelaPerfil token={TOKEN} onEncerrarSessao={vi.fn()} onVoltar={vi.fn()} />)
    await screen.findByLabelText('Nome completo')

    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    const botao = await screen.findByRole('button', { name: 'Salvando...' })
    expect(botao).toBeDisabled()
    expect(screen.getByLabelText('Nome completo')).toBeDisabled()

    resolver?.(respostaJson(200, PERFIL))
  })

  // -----------------------------------------------------------------------
  // 3. Validacao local
  // -----------------------------------------------------------------------
  it('nao chama a API quando o nome esta vazio e marca o campo', async () => {
    const fetchFalso = instalarFetch(({ url }) => {
      if (url === '/api/perfil') return respostaJson(200, PERFIL)
      throw new Error(`URL inesperada no teste: ${url}`)
    })

    render(<TelaPerfil token={TOKEN} onEncerrarSessao={vi.fn()} onVoltar={vi.fn()} />)
    await screen.findByLabelText('Nome completo')

    const usuario = userEvent.setup()
    await usuario.clear(screen.getByLabelText('Nome completo'))
    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByText('Informe o nome.')).toBeInTheDocument()
    expect(screen.getByLabelText('Nome completo')).toHaveAttribute('aria-invalid', 'true')
    // A mensagem do topo aponta o campo que esta errado.
    expect(
      screen.getByText('Não foi possível salvar. Verifique: nome completo.'),
    ).toBeInTheDocument()
    // So a leitura inicial foi feita; nenhuma atualizacao saiu.
    expect(fetchFalso.mock.calls.filter((chamada) => chamada[1]?.method === 'PUT')).toHaveLength(0)
  })

  it('recusa meta fora de 1 a 168 sem chamar a API', async () => {
    const fetchFalso = instalarFetch(({ url }) => {
      if (url === '/api/perfil') return respostaJson(200, PERFIL)
      throw new Error(`URL inesperada no teste: ${url}`)
    })

    render(<TelaPerfil token={TOKEN} onEncerrarSessao={vi.fn()} onVoltar={vi.fn()} />)
    await screen.findByLabelText('Nome completo')

    const usuario = userEvent.setup()
    const meta = screen.getByLabelText('Meta de estudo semanal (horas)')
    await usuario.clear(meta)
    await usuario.type(meta, '200')
    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByText('A meta semanal deve ter no máximo 168 horas.')).toBeInTheDocument()
    expect(fetchFalso.mock.calls.filter((chamada) => chamada[1]?.method === 'PUT')).toHaveLength(0)
  })

  it('exibe o erro por campo devolvido pela API', async () => {
    instalarBackend(() =>
      respostaJson(409, {
        erros: [{ campo: 'email', mensagem: 'Ja existe um usuario cadastrado com este e-mail.' }],
      }),
    )

    render(<TelaPerfil token={TOKEN} onEncerrarSessao={vi.fn()} onVoltar={vi.fn()} />)
    await screen.findByLabelText('Nome completo')

    const usuario = userEvent.setup()
    await usuario.clear(screen.getByLabelText('E-mail'))
    await usuario.type(screen.getByLabelText('E-mail'), 'outro@email.com')
    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(
      await screen.findByText('Ja existe um usuario cadastrado com este e-mail.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByText('Perfil atualizado com sucesso.')).not.toBeInTheDocument()
    // Alem da marca no campo, o topo diz qual campo corrigir.
    expect(screen.getByText('Não foi possível salvar. Verifique: e-mail.')).toBeInTheDocument()
  })

  it('lista varios campos na mensagem do topo quando a API aponta mais de um erro', async () => {
    instalarBackend(() =>
      respostaJson(400, {
        erros: [
          { campo: 'nome', mensagem: 'O nome deve ter no máximo 120 caracteres.' },
          { campo: 'email', mensagem: 'Informe um e-mail válido.' },
        ],
      }),
    )

    render(<TelaPerfil token={TOKEN} onEncerrarSessao={vi.fn()} onVoltar={vi.fn()} />)
    await screen.findByLabelText('Nome completo')

    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(
      await screen.findByText(
        'Não foi possível salvar. Verifique: nome completo, e-mail.',
      ),
    ).toBeInTheDocument()
  })

  it('mantem a mensagem generica quando a resposta da API nao aponta campo', async () => {
    // Resposta de erro sem a chave `erros` (ex.: 500 padrao do Spring, 403
    // vazio do CORS). O campo permanece sem marca e a mensagem continua a
    // generica de sempre.
    instalarBackend(() =>
      respostaJson(500, {
        timestamp: '2026-10-08T17:30:00.000+00:00',
        status: 500,
        error: 'Internal Server Error',
        path: '/api/perfil',
      }),
    )

    render(<TelaPerfil token={TOKEN} onEncerrarSessao={vi.fn()} onVoltar={vi.fn()} />)
    await screen.findByLabelText('Nome completo')

    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(
      await screen.findByText('Não foi possível salvar. Tente novamente.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Verifique:/)).not.toBeInTheDocument()
  })

  // -----------------------------------------------------------------------
  // 4. Sessao e navegacao
  // -----------------------------------------------------------------------
  it('encerra a sessao quando o token nao vale mais (401)', async () => {
    const onEncerrarSessao = vi.fn()
    instalarBackend(() =>
      respostaJson(401, {
        erros: [{ campo: 'autenticacao', mensagem: 'Faca login para acessar este recurso.' }],
      }),
    )

    render(
      <TelaPerfil
        token="token-antigo"
        onEncerrarSessao={onEncerrarSessao}
        onVoltar={vi.fn()}
      />,
    )
    await screen.findByLabelText('Nome completo')

    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    await waitFor(() => {
      expect(onEncerrarSessao).toHaveBeenCalledWith(
        'Sua sessão expirou. Faça login novamente.',
      )
    })
  })

  it('volta para a area autenticada pelo botao Voltar', async () => {
    const { onVoltar } = await montarEPreencher()

    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }))

    expect(onVoltar).toHaveBeenCalledTimes(1)
  })
})
