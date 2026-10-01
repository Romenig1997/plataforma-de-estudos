import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuracao minima da Etapa 0.
// O design system e o proxy para a API entram na HU01 e na HU06.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
})