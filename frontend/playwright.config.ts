import { defineConfig } from '@playwright/test'

/**
 * Testes ponta a ponta da HU06.
 *
 * <p>Recaem sobre a interface (Playwright + axe) para os dois criterios que o
 * Vitest/jsdom nao alcanca: responsividade real e contraste de cor. O
 * `webServer` sobe o dev server do Vite; as telas testadas sao publicas, entao
 * nao precisam do backend no ar.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})