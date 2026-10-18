import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// Configuracao da Etapa 0 + HU01 (Cadastro) + HU02 (Autenticacao).
// O design system completo (tokens, componentes, responsividade por
// breakpoint) e definido na HU06 - ver docs/03-ux-ui.md.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiProxyTarget = env.API_PROXY_TARGET || 'http://localhost:8080'

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      port: 5173,
      // Proxy do dev server para a API: o frontend chama /api/usuarios por
      // caminho relativo e o Vite encaminha para o backend configurado. Isso
      // evita CORS no dev e mantém a mesma URL usada em produção.
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          // O navegador fala apenas com o Vite (mesma origem). Se o proxy
          // repassar o Origin local para a API publicada, a politica CORS da
          // producao rejeita a requisicao antes do login. O backend nao
          // precisa desse cabecalho no caminho interno Vite -> API.
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyRequest) => {
              proxyRequest.removeHeader('origin')
            })
          },
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
  }
})
