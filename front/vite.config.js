import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { staticPwa } from './pwa/build.js'

// O front chama /api/* e o Vite encaminha para o FastAPI (evita CORS no dev).
export default defineConfig({
  plugins: [react(), staticPwa()],
  server: {
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:8000',
        ws: true, // encaminha também o WebSocket do chat (/api/ws -> /ws)
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
