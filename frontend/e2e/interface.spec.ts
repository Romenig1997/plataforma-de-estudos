import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * Criterios de aceite da HU06, validados no navegador de verdade.
 *
 * <p>O Vitest (jsdom) nao calcula layout nem aplica CSS, entao responsividade
 * e contraste so podem ser verificados aqui. O terceiro criterio (borda
 * vermelha no erro) e conferido visualmente, na cor calculada pelo navegador.
 */

async function naoTemScrollHorizontal(page: Page): Promise<void> {
  const estourou = await page.evaluate(() => {
    // Scroll horizontal existe quando o conteudo e mais largo que a janela.
    return document.documentElement.scrollWidth > document.documentElement.clientWidth
  })
  expect(estourou, 'a pagina nao deve ter rolagem horizontal').toBe(false)
}

test.describe('HU06 - interface de usuario', () => {
  // -----------------------------------------------------------------------
  // Criterio 1: telas responsivas (funcionam no celular e no PC)
  // -----------------------------------------------------------------------
  test('o login nao estoura a largura no celular nem no PC', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Entrar na plataforma' })).toBeVisible()

    await naoTemScrollHorizontal(page)

    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Entrar na plataforma' })).toBeVisible()

    await naoTemScrollHorizontal(page)
  })

  test('o cadastro nao estoura a largura no celular nem no PC', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 })
    await page.goto('/')
    await page.getByRole('button', { name: 'Cadastre-se' }).click()
    await expect(page.getByRole('heading', { name: 'Cadastro de Usuário' })).toBeVisible()

    await naoTemScrollHorizontal(page)

    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/cadastro')
    await expect(page.getByRole('heading', { name: 'Cadastro de Usuário' })).toBeVisible()

    await naoTemScrollHorizontal(page)
  })

  // -----------------------------------------------------------------------
  // Criterio 2: cores e contrastes adequados
  // -----------------------------------------------------------------------
  test('o login passa na auditoria de acessibilidade (axe), sem falha de contraste', async ({
    page,
  }) => {
    await page.goto('/')

    const resultado = await new AxeBuilder({ page }).analyze()

    const falhasDeContraste = resultado.violations.filter(
      (violacao) => violacao.id === 'color-contrast',
    )
    expect(falhasDeContraste, 'nenhuma violacao de contraste de cor').toEqual([])

    const violacoesSerias = resultado.violations.filter(
      (violacao) => violacao.impact === 'critical' || violacao.impact === 'serious',
    )
    expect(violacoesSerias, 'nenhuma violacao seria ou critica').toEqual([])
  })

  // -----------------------------------------------------------------------
  // Criterio 3: formularios com feedback visual (ex.: borda vermelha no erro)
  // -----------------------------------------------------------------------
  test('o campo invalido ganha borda vermelha quando o formulario rejeita o envio', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Entrar' }).click()

    const campoEmail = page.locator('#email')
    const campoSenha = page.locator('#senha')

    // A mensagem de erro aparece e o campo passa a sinalizar invalidez.
    await expect(page.getByText('Informe o e-mail.')).toBeVisible()
    await expect(campoEmail).toHaveAttribute('aria-invalid', 'true')
    await expect(campoSenha).toHaveAttribute('aria-invalid', 'true')

    // Borda vermelha calculada no navegador (#dc2626).
    await expect(campoEmail).toHaveCSS('border-color', 'rgb(220, 38, 38)')
    await expect(campoSenha).toHaveCSS('border-color', 'rgb(220, 38, 38)')
  })
})