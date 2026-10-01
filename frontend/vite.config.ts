import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuracao da Etapa 0 + HU01 (Cadastro de Usuarios).
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
})