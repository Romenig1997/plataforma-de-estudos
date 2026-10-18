import { defineConfig } from '@playwright/test'

/**
 * Testes ponta a ponta (Playwright + axe): responsividade real, contraste,
 * acessibilidade e fluxos com API simulada.
 *
 * <p>O `webServer` sobe um dev server do Vite proprio, na porta 5174, com um
 * Supabase ficticio. Assim os testes nunca reaproveitam o dev server do dia a
 * dia (que pode apontar para um projeto Supabase real) e nao dependem de rede:
 * as chamadas a `/api` e ao Supabase Auth sao respondidas em `e2e/fixtures.ts`.
 */
const PORTA = 5174

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORTA}`,
  },
  webServer: {
    command: `npx vite --port ${PORTA} --strictPort`,
    url: `http://localhost:${PORTA}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      VITE_SUPABASE_URL: 'http://supabase-ficticio.localhost',
      VITE_SUPABASE_ANON_KEY: 'chave-publica-ficticia',
    },
  },
})
