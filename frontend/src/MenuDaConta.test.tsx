import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import MenuDaConta from './MenuDaConta'
import { SessaoContexto } from './contextoDaSessao'
import type { Usuario } from './sessao'

const ALUNO: Usuario = { id: 1, nome: 'Ana', email: 'ana@email.com', perfil: 'ALUNO', avatarUrl: null }

function renderizar(usuario: Usuario, aoSair = vi.fn()) {
  render(
    <SessaoContexto.Provider value={{ usuario, atualizarUsuario: vi.fn() }}>
      <MemoryRouter><MenuDaConta onEncerrarSessao={aoSair} /></MemoryRouter>
    </SessaoContexto.Provider>,
  )
  return aoSair
}

describe('MenuDaConta', () => {
  it('mostra os atalhos da conta e encerra a sessão', async () => {
    const usuario = userEvent.setup()
    const aoSair = renderizar(ALUNO)

    await usuario.click(screen.getByRole('button', { name: 'Abrir menu da conta' }))

    expect(screen.getByRole('menuitem', { name: 'Meu perfil' })).toHaveAttribute('href', '/perfil')
    expect(screen.getByRole('menuitem', { name: 'Segurança e configurações' })).toHaveAttribute('href', '/seguranca')
    expect(screen.queryByRole('menuitem', { name: 'Área administrativa' })).not.toBeInTheDocument()

    await usuario.click(screen.getByRole('menuitem', { name: 'Sair' }))
    expect(aoSair).toHaveBeenCalledOnce()
  })

  it('mostra a área administrativa e a foto do Storage para ADMIN', async () => {
    const usuario = userEvent.setup()
    renderizar({ ...ALUNO, perfil: 'ADMIN', avatarUrl: 'https://projeto.supabase.co/storage/v1/object/public/avatars/u/a.png' })

    const gatilho = screen.getByRole('button', { name: 'Abrir menu da conta' })
    expect(gatilho.querySelector('img')).toHaveAttribute('src', 'https://projeto.supabase.co/storage/v1/object/public/avatars/u/a.png')
    await usuario.click(gatilho)
    expect(screen.getByRole('menuitem', { name: 'Área administrativa' })).toHaveAttribute('href', '/admin')
  })

  it('fecha o menu com Escape', async () => {
    const usuario = userEvent.setup()
    renderizar(ALUNO)

    await usuario.click(screen.getByRole('button', { name: 'Abrir menu da conta' }))
    await usuario.keyboard('{Escape}')

    expect(screen.queryByRole('menu', { name: 'Opções da conta' })).not.toBeInTheDocument()
  })
})
