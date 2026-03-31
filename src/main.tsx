import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Attiva i mock se VITE_MOCK_MODE=true
if (import.meta.env.VITE_MOCK_MODE === 'true') {
  const { setupMocks } = await import('./mocks/setup')
  setupMocks()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
