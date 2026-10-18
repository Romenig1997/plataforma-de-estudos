import { test as base, type Page } from '@playwright/test'

/**
 * Isola os testes ponta a ponta de qualquer backend e de qualquer Supabase
 * real.
 *
 * <p>Toda chamada a `/api` que o teste nao simulou recebe 503. Sem isso, o
 * proxy do Vite encaminharia a chamada para o backend configurado (local ou
 * publicado) e um 401 de verdade encerraria a sessao ficticia no meio do
 * teste. O Supabase Auth aponta para um endereco ficticio (ver
 * playwright.config.ts) e tambem e respondido aqui. As rotas registradas pelo
 * proprio teste tem prioridade sobre estas.
 */
export const test = base.extend({
  page: async ({ page }, usar) => {
    await page.route('**/api/**', route => route.fulfill({ status: 503, json: { erros: [] } }))
    await page.route('**/auth/v1/**', route => route.fulfill({ status: 204 }))
    await usar(page)
  },
})

export { expect } from '@playwright/test'

/** Mesma chave de `src/supabase.ts`. */
const CHAVE_DA_SESSAO = 'plataforma:sessao'

export const USUARIO_E2E = { id: 1, nome: 'Ana Souza', email: 'ana@email.com', avatarUrl: null }

/**
 * Abre a pagina ja com uma sessao do Supabase Auth guardada, como o
 * supabase-js deixa no navegador depois do login, e responde o perfil da
 * sessao em `/api/auth/me`. O teste pode registrar outra resposta para
 * `/api/auth/me` depois desta chamada.
 */
export async function entrarComo(page: Page, perfil: 'ALUNO' | 'ADMIN') {
  await page.addInitScript(([chave]) => {
    const agora = Math.floor(Date.now() / 1000)
    localStorage.setItem(chave, JSON.stringify({
      access_token: 'token-ficticio',
      refresh_token: 'refresh-ficticio',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: agora + 3600,
      user: {
        id: '00000000-0000-4000-8000-000000000001',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'ana@email.com',
        app_metadata: { provider: 'email' },
        user_metadata: { nome: 'Ana Souza' },
        created_at: new Date().toISOString(),
      },
    }))
  }, [CHAVE_DA_SESSAO])
  await page.route('**/api/auth/me', route => route.fulfill({ json: { ...USUARIO_E2E, perfil } }))
}
