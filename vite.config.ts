import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/account': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/analysis': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },
})
