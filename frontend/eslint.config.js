import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

// Flat config (ESLint 9+). Configuracao minima da Etapa 0.
//
// Acessibilidade: nao entra como plugin de lint porque o
// `eslint-plugin-jsx-a11y` ainda nao suporta o ESLint 10 usado no projeto
// (peer depende de `^9`). A auditoria de acessibilidade e feita no teste
// ponta a ponta com o axe (HU06, criterio 2).

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'test-results', 'playwright-report'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
  },
  {
    // Testes E2E e configuracao do Playwright rodam em Node, nao no navegador.
    files: ['e2e/**', 'playwright.config.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
)