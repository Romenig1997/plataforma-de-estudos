import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MenuDaConta from './MenuDaConta'

const { buscarFoto } = vi.hoisted(() => ({ buscarFoto: vi.fn() }))

vi.mock('./fotoPerfil', () => ({ buscarFoto }))

describe('MenuDaConta', () => {
  beforeEach(() => {
    buscarFoto.mockResolvedValue(null)
  })

  it('mostra os atalhos da conta e encerra a sessão', async () => {
    const usuario = userEvent.setup()
    const aoSair = vi.fn()

    render(<MemoryRouter><MenuDaConta token="token" onEncerrarSessao={aoSair} /></MemoryRouter>)
    await usuario.click(screen.getByRole('button', { name: 'Abrir menu da conta' }))

    expect(screen.getByRole('menuitem', { name: 'Meu perfil' })).toHaveAttribute('href', '/perfil')
    expect(screen.getByRole('menuitem', { name: 'Segurança e configurações' })).toHaveAttribute('href', '/seguranca')

    await usuario.click(screen.getByRole('menuitem', { name: 'Sair' }))
    expect(aoSair).toHaveBeenCalledOnce()
  })

  it('fecha o menu com Escape', async () => {
    const usuario = userEvent.setup()
    render(<MemoryRouter><MenuDaConta token="token" onEncerrarSessao={vi.fn()} /></MemoryRouter>)

    await usuario.click(screen.getByRole('button', { name: 'Abrir menu da conta' }))
    await usuario.keyboard('{Escape}')

    expect(screen.queryByRole('menu', { name: 'Opções da conta' })).not.toBeInTheDocument()
  })
})
