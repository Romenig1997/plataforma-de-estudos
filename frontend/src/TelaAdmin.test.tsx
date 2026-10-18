import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import TelaAdmin from './TelaAdmin'
import { instalarFetch, respostaJson } from './testes/ajuda'

/**
 * Visao geral do painel de gestao: indicadores, pendencias e numeros por
 * curso vindos de `/api/admin/resumo`, mais os estados de erro da HU04
 * (403 sem encerrar a sessao, 401 encerrando, rede fora com nova tentativa).
 */
describe('TelaAdmin (visão geral)', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  const TOKEN = 'token-da-sessao'

  const RESUMO = {
    totalAlunos: 248,
    totalAdministradores: 2,
    novosAlunos30Dias: 37,
    contasSemConfirmacao: 9,
    cursosPublicados: 1,
    editaisAguardandoRevisao: 0,
    questoesPublicadas: 1180,
    questoesEmRascunho: 54,
    cursos: [{ editalId: 3, titulo: 'PF 2026', sigla: 'PF', inscritos: 112, questoesPublicadas: 900, questoesEmRascunho: 54 }],
    cadastrosRecentes: [{ id: 9, nome: 'Bruno Lima', perfil: 'ALUNO', criadoEm: '2026-10-15T12:00:00-03:00' }],
  }

  function renderizar(onEncerrarSessao = vi.fn()) {
    render(<MemoryRouter><TelaAdmin token={TOKEN} onEncerrarSessao={onEncerrarSessao} /></MemoryRouter>)
    return onEncerrarSessao
  }

  it('mostra os indicadores pedindo o resumo com o token no cabecalho', async () => {
    const fetchFalso = instalarFetch(() => respostaJson(200, RESUMO))

    renderizar()

    expect(screen.getByRole('heading', { name: 'Visão geral' })).toBeInTheDocument()
    const indicadores = await screen.findByRole('group', { name: 'Indicadores da plataforma' })
    expect(within(indicadores).getByText('248')).toBeInTheDocument()
    expect(within(indicadores).getByText('1.180')).toBeInTheDocument()

    expect(String(fetchFalso.mock.calls[0][0])).toBe('/api/admin/resumo')
    expect(new Headers(fetchFalso.mock.calls[0][1]?.headers).get('Authorization')).toBe(`Bearer ${TOKEN}`)
  })

  it('liga as pendencias as telas que resolvem cada uma', async () => {
    instalarFetch(() => respostaJson(200, RESUMO))

    renderizar()

    expect(await screen.findByRole('link', { name: 'Revisar questões' })).toHaveAttribute('href', '/admin/questoes')
    expect(screen.getByRole('link', { name: 'Ver contas' })).toHaveAttribute('href', '/admin/alunos?situacao=pendente')
    // Sem editais pendentes, a linha diz que esta em dia em vez de oferecer o link.
    expect(screen.queryByRole('link', { name: 'Revisar editais' })).not.toBeInTheDocument()
    expect(screen.getByText('Em dia')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'PF 2026' })).toHaveAttribute('href', '/admin/cursos?curso=3')
  })

  it('mostra os novos alunos do mes e os cadastros recentes com data', async () => {
    instalarFetch(() => respostaJson(200, RESUMO))

    renderizar()

    const indicadores = await screen.findByRole('group', { name: 'Indicadores da plataforma' })
    expect(within(indicadores).getByText('Novos alunos (30 dias)')).toBeInTheDocument()
    expect(within(indicadores).getByText('37')).toBeInTheDocument()
    const recentes = screen.getByRole('region', { name: 'Cadastros recentes' })
    expect(within(recentes).getByText('Bruno Lima')).toBeInTheDocument()
    expect(within(recentes).getByText('15/10/2026')).toBeInTheDocument()
  })

  it('sem cursos convida a importar um edital', async () => {
    instalarFetch(() => respostaJson(200, { ...RESUMO, cursosPublicados: 0, cursos: [] }))

    renderizar()

    expect(await screen.findByRole('heading', { name: 'Nenhum curso publicado' })).toBeInTheDocument()
  })

  it('mostra o 403 da area admin sem encerrar a sessao', async () => {
    instalarFetch(() => respostaJson(403, {
      erros: [{ campo: 'autorizacao', mensagem: 'Voce nao tem permissao para acessar este recurso.' }],
    }))

    const onEncerrarSessao = renderizar()

    expect(await screen.findByRole('alert')).toHaveTextContent('Voce nao tem permissao para acessar este recurso.')
    expect(onEncerrarSessao).not.toHaveBeenCalled()
  })

  it('encerra a sessao quando o token deixa de valer (401)', async () => {
    instalarFetch(() => respostaJson(401, {
      erros: [{ campo: 'autenticacao', mensagem: 'Faca login para acessar este recurso.' }],
    }))

    const onEncerrarSessao = renderizar()

    await waitFor(() => expect(onEncerrarSessao).toHaveBeenCalledWith('Sua sessão expirou. Faça login novamente.'))
  })

  it('mostra o erro de rede e permite tentar de novo', async () => {
    const fetchFalso = instalarFetch(() => {
      throw new TypeError('Failed to fetch')
    })

    renderizar()

    expect(await screen.findByRole('alert')).toHaveTextContent(/Não foi possível conectar ao servidor/)

    fetchFalso.mockImplementation(() => Promise.resolve(respostaJson(200, RESUMO)))
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByRole('group', { name: 'Indicadores da plataforma' })).toBeInTheDocument()
  })
})
