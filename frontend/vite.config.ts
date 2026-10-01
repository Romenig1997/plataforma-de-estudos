import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Configuracao da Etapa 0 + HU01 (Cadastro) + HU02 (Autenticacao).
// O design system completo (tokens, componentes, responsividade por
// breakpoint) e definido na HU06 - ver docs/03-ux-ui.md.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy do dev server para a API: o frontend chama /api/usuarios por
    // caminho relativo e o Vite encaminha para o backend local. Isso evita
    // CORS no dev e mantem a mesma URL na producao (servidor unico).
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  test: {
    // jsdom: os testes de tela precisam de DOM. `fetch` NAO existe no jsdom, e
    // por isso cada teste declara o que a API responde - ver os arquivos
    // *.test.tsx.
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/preparacaoTestes.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})