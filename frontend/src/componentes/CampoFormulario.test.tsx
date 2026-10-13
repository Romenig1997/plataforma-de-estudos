import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import CampoFormulario from './CampoFormulario'

/**
 * CampoFormulario (design system, HU06): liga o label ao controle, marca o
 * campo invalido no `aria-invalid` e descreve o erro/ajuda pelo
 * `aria-describedby`. E o criterio 3 da HU (feedback visual de formulario) na
 * forma de contrato acessivel — a borda vermelha e o CSS que reage a esse
 * `aria-invalid`.
 */
describe('CampoFormulario', () => {
  it('liga o label ao controle pelo id', () => {
    render(
      <CampoFormulario id="email" rotulo="E-mail">
        <input type="email" name="email" />
      </CampoFormulario>,
    )

    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('id', 'email')
  })

  it('marca o campo invalido e descreve a mensagem de erro', () => {
    render(
      <CampoFormulario id="senha" rotulo="Senha" erro="Informe a senha.">
        <input type="password" name="senha" />
      </CampoFormulario>,
    )

    const campo = screen.getByLabelText('Senha')
    expect(campo).toHaveAttribute('aria-invalid', 'true')
    expect(campo).toHaveAccessibleDescription('Informe a senha.')
    expect(screen.getByRole('alert')).toHaveTextContent('Informe a senha.')
  })

  it('referencia o texto de apoio pelo aria-describedby sem marcar erro', () => {
    render(
      <CampoFormulario id="meta" rotulo="Meta de estudo semanal" ajuda="Opcional.">
        <input type="number" name="meta" />
      </CampoFormulario>,
    )

    const campo = screen.getByLabelText('Meta de estudo semanal')
    expect(campo).toHaveAttribute('aria-invalid', 'false')
    expect(campo).toHaveAccessibleDescription('Opcional.')
  })
})