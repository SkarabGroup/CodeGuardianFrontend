import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  // Carica le variabili d'ambiente (anche quelle senza prefisso VITE_ se si usa la stringa vuota '')
  const env = loadEnv(mode, process.cwd(), '')
  
  // Definisce i target dal vero file .env, con fallback sicuri per lo sviluppo in locale
  const accountTarget = env.VITE_ACCOUNT_TARGET || 'http://localhost:3001'
  const analysisTarget = env.VITE_ANALYSIS_TARGET || 'http://localhost:3002'

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        '/account': {
          target: accountTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/account/, ''),
        },
        '/analysis': {
          target: analysisTarget,
          changeOrigin: true,
        },
        '/repositories': {
          target: analysisTarget,
          changeOrigin: true,
          bypass(req) {
            if (req.headers.accept?.includes('text/html')) {
              return '/index.html'
            }
          }
        },
        '/pat': {
          target: analysisTarget,
          changeOrigin: true,
          bypass(req) {
            if (req.headers.accept?.includes('text/html')) {
              return '/index.html'
            }
          }
        },
      },
    },
  }
})
