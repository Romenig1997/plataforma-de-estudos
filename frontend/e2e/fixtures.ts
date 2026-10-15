import { test as base } from '@playwright/test'

/**
 * Isola os testes ponta a ponta de qualquer backend real.
 *
 * <p>Toda chamada a `/api` que o teste nao simulou recebe 503. Sem isso, o
 * proxy do Vite encaminharia a chamada para o backend configurado (local ou
 * publicado) e um 401 de verdade encerraria a sessao ficticia no meio do
 * teste. As rotas registradas pelo proprio teste tem prioridade sobre esta.
 */
export const test = base.extend({
  page: async ({ page }, usar) => {
    await page.route('**/api/**', route => route.fulfill({ status: 503, json: { erros: [] } }))
    await usar(page)
  },
})

export { expect } from '@playwright/test'
