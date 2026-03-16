import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
    host: true,
    // Proxy eliminado: el frontend ya no se comunica con localhost:4000
    // Todas las llamadas van directamente a los webhooks de n8n configurados en .env
  },
  build: {
    sourcemap: true,
  },
})
