import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import TelaAdminAlunos from './TelaAdminAlunos'
import { corpoEnviado, instalarFetch, respostaJson, type ChamadaFetch } from './testes/ajuda'

/**
 * Gestao de alunos: filtros (inclusive vindos do endereco), troca de perfil
 * com confirmacao e a propria conta sem seletor.
 */
describe('TelaAdminAlunos', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  const TOKEN = 'token-da-sessao'
  const EU = { id: 7, nome: 'Ana Souza', email: 'ana@email.com', perfil: 'ADMIN' as const, emailVerificado: true }
  const BRUNO = { id: 9, nome: 'Bruno Lima', email: 'bruno@email.com', perfil: 'ALUNO' as const, emailVerificado: false }
  const CARLA = { id: 11, nome: 'Carla Mendes', email: 'carla@email.com', perfil: 'ALUNO' as const, emailVerificado: true }

  function backend(extra?: (chamada: ChamadaFetch) => Response | undefined) {
    return instalarFetch(chamada => {
      const resposta = extra?.(chamada)
      if (resposta) return resposta
      if (chamada.url === '/api/admin/usuarios') return respostaJson(200, [EU, BRUNO, CARLA])
      if (chamada.url === '/api/auth/me') return respostaJson(200, EU)
      throw new Error(`URL inesperada no teste: ${chamada.url}`)
    })
  }

  function renderizar(endereco = '/admin/alunos') {
    render(<MemoryRouter initialEntries={[endereco]}><TelaAdminAlunos token={TOKEN} onEncerrarSessao={vi.fn()} /></MemoryRouter>)
  }

  it('lista as contas com a situacao do e-mail e sem seletor para a propria conta', async () => {
    backend()
    renderizar()

    expect(await screen.findByText('Bruno Lima')).toBeInTheDocument()
    expect(screen.getByText('Administrador (você)')).toBeInTheDocument()
    expect(screen.queryByLabelText('Perfil de Ana Souza')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Perfil de Bruno Lima')).toHaveValue('ALUNO')
    expect(screen.getByText('Pendente')).toBeInTheDocument()
    expect(screen.getByText('3 contas')).toBeInTheDocument()
  })

  it('filtra por nome e por situacao vinda do endereco', async () => {
    backend()
    renderizar('/admin/alunos?situacao=pendente')

    expect(await screen.findByText('Bruno Lima')).toBeInTheDocument()
    expect(screen.queryByText('Carla Mendes')).not.toBeInTheDocument()
    expect(screen.getByText('1 de 3 contas')).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('E-mail'), 'todas')
    await userEvent.type(screen.getByLabelText('Buscar'), 'carla')
    expect(screen.getByText('Carla Mendes')).toBeInTheDocument()
    expect(screen.queryByText('Bruno Lima')).not.toBeInTheDocument()
  })

  it('troca o perfil so depois de confirmar', async () => {
    const fetchFalso = backend(({ url }) =>
      url === '/api/admin/usuarios/9/perfil' ? respostaJson(200, { ...BRUNO, perfil: 'ADMIN' }) : undefined)
    renderizar()

    await userEvent.selectOptions(await screen.findByLabelText('Perfil de Bruno Lima'), 'ADMIN')
    const confirmacao = screen.getByRole('group', { name: 'Confirmar troca de perfil de Bruno Lima' })
    expect(confirmacao).toHaveTextContent('A conta precisará entrar de novo.')
    expect(fetchFalso.mock.calls.some(chamada => String(chamada[0]).endsWith('/perfil'))).toBe(false)

    await userEvent.click(within(confirmacao).getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText(/Bruno Lima agora é administrador/)).toBeInTheDocument()
    const chamada = fetchFalso.mock.calls.find(item => String(item[0]) === '/api/admin/usuarios/9/perfil')
    expect(chamada?.[1]?.method).toBe('PUT')
    expect(corpoEnviado({ url: String(chamada?.[0]), init: chamada?.[1] })).toEqual({ perfil: 'ADMIN' })
    expect(screen.getByLabelText('Perfil de Bruno Lima')).toHaveValue('ADMIN')
  })

  it('cancelar a confirmacao mantem o perfil', async () => {
    backend()
    renderizar()

    await userEvent.selectOptions(await screen.findByLabelText('Perfil de Bruno Lima'), 'ADMIN')
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.getByLabelText('Perfil de Bruno Lima')).toHaveValue('ALUNO')
  })

  it('mostra o erro devolvido pela API na troca de perfil', async () => {
    backend(({ url }) => url === '/api/admin/usuarios/9/perfil'
      ? respostaJson(400, { erros: [{ campo: 'perfil', mensagem: 'Escolha o perfil ADMIN ou ALUNO.' }] })
      : undefined)
    renderizar()

    await userEvent.selectOptions(await screen.findByLabelText('Perfil de Bruno Lima'), 'ADMIN')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText('Escolha o perfil ADMIN ou ALUNO.')).toBeInTheDocument()
  })

  it('exclui a conta de um aluno depois da confirmacao (HU15)', async () => {
    const fetch = backend(({ url, init }) => url === '/api/admin/usuarios/9' && init?.method === 'DELETE' ? respostaJson(204) : undefined)
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Excluir conta de Bruno Lima' }))
    expect(screen.getByRole('group', { name: 'Confirmar exclusão de Bruno Lima' })).toHaveTextContent('não pode ser desfeita')
    await userEvent.click(screen.getByRole('button', { name: 'Excluir conta' }))

    expect(await screen.findByText('A conta de Bruno Lima foi excluída com todos os dados.')).toBeInTheDocument()
    expect(screen.queryByText('bruno@email.com')).not.toBeInTheDocument()
    expect(screen.getByText('2 contas')).toBeInTheDocument()
    expect(fetch.mock.calls.some(([url, init]) => url === '/api/admin/usuarios/9' && init?.method === 'DELETE')).toBe(true)
  })

  it('nao oferece exclusao para administradores nem para a propria conta', async () => {
    backend()
    renderizar()

    await screen.findByText('Bruno Lima')
    expect(screen.queryByRole('button', { name: 'Excluir conta de Ana Souza' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Excluir conta de Carla Mendes' })).toBeInTheDocument()
  })

  it('cancelar a exclusao mantem a conta', async () => {
    const fetch = backend()
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Excluir conta de Carla Mendes' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.getByText('Carla Mendes')).toBeInTheDocument()
    expect(fetch.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false)
  })
})
