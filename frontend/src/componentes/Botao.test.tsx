import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Botao from './Botao'

/**
 * Botao (design system, HU06): as duas variantes visuais e o estado
 * `carregando`, que desabilita o botao durante uma acao em andamento.
 */
describe('Botao', () => {
  it('renderiza a variante primaria por padrao', () => {
    render(<Botao>Entrar</Botao>)

    const botao = screen.getByRole('button', { name: 'Entrar' })
    expect(botao).toHaveClass('btn-enviar')
    expect(botao).toBeEnabled()
  })

  it('renderiza a variante secundaria e desabilita quando carregando', () => {
    render(
      <Botao variante="secundario" carregando>
        Salvando...
      </Botao>,
    )

    const botao = screen.getByRole('button', { name: 'Salvando...' })
    expect(botao).toHaveClass('btn-secundario')
    expect(botao).toBeDisabled()
  })

  it('repassa o clique e o atributo type para o button', async () => {
    const aoClicar = vi.fn()
    render(
      <Botao type="button" onClick={aoClicar}>
        Voltar
      </Botao>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }))

    expect(aoClicar).toHaveBeenCalledTimes(1)
  })
})