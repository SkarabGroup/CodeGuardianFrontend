import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/lib/utils.ts',
        'src/components/ui/badge.tsx',
        'src/components/ui/button.tsx',
        'src/components/ui/input.tsx',
        'src/components/ui/skeleton.tsx',
        'src/components/ui/card.tsx',
        'src/components/ui/separator.tsx',
        'src/components/ui/progress.tsx',
        'src/components/analysis/AnalysisStatusBadge.tsx',
        'src/components/shared/ScoreCard.tsx',
      ],
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 95,
        statements: 100,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
