import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { RepositoriesPage } from '@/pages/RepositoriesPage'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = vi.hoisted(() => vi.fn())
const mockList = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/api/repositories', () => ({
  repositoriesApi: {
    list: mockList,
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getRanking: vi.fn().mockResolvedValue([]),
    startAnalysis: vi.fn(),
    getHistory: vi.fn().mockResolvedValue({ items: [], totalPages: 1 }),
  },
}))

vi.mock('@/hooks/useAnalysisPolling', () => ({
  useAnalysisPolling: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const repoWithFailed = {
  id: 'r1',
  name: 'broken-repo',
  url: 'https://github.com/org/broken-repo',
  lastAnalysis: {
    id: 'a1',
    date: '2025-04-01T00:00:00.000Z',
    status: 'failed' as const,
    report: undefined,
  },
}

const repoCompleted = {
  id: 'r2',
  name: 'good-repo',
  url: 'https://github.com/org/good-repo',
  lastAnalysis: {
    id: 'a2',
    date: '2025-04-01T00:00:00.000Z',
    status: 'completed' as const,
    report: { qualityScore: 85, securityScore: 90, documentationScore: 70, criticalIssues: 0, warningIssues: 1 },
  },
}

function renderPage() {
  return render(
    <MemoryRouter>
      <RepositoriesPage />
    </MemoryRouter>,
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RepositoriesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // TU-5.2 — informativa lista vuota
  it('shows empty state message when no repositories exist', async () => {
    mockList.mockResolvedValue([])
    renderPage()
    await waitFor(
      () => expect(screen.getByText('Nessun repository')).toBeInTheDocument(),
      { timeout: 2000 },
    )
    expect(screen.getByText(/aggiungi il primo repository/i)).toBeInTheDocument()
  })

  // TU-5.3 — inibizione rendering e notifica di errore se servizi non raggiungibili
  it('shows error message and retry button when loading fails', async () => {
    mockList.mockRejectedValue(new Error('Network error'))
    renderPage()
    await waitFor(
      () => expect(screen.getByText(/impossibile caricare i repository/i)).toBeInTheDocument(),
      { timeout: 2000 },
    )
    expect(screen.getByRole('button', { name: /riprova/i })).toBeInTheDocument()
  })

  // TU-5.6 — stato "Fallita" visibile nella lista
  it('shows FAILED status badge for repositories with failed analysis', async () => {
    mockList.mockResolvedValue([repoWithFailed])
    renderPage()
    await waitFor(
      () => expect(screen.getByText('FAILED')).toBeInTheDocument(),
      { timeout: 2000 },
    )
  })

  // Repository con analisi completata
  it('shows COMPLETED status badge for repositories with completed analysis', async () => {
    mockList.mockResolvedValue([repoCompleted])
    renderPage()
    await waitFor(
      () => expect(screen.getByText('COMPLETED')).toBeInTheDocument(),
      { timeout: 2000 },
    )
  })

  // Nome repository visibile
  it('displays repository names in the list', async () => {
    mockList.mockResolvedValue([repoCompleted, repoWithFailed])
    renderPage()
    await waitFor(() => expect(screen.getByText('good-repo')).toBeInTheDocument(), { timeout: 2000 })
    expect(screen.getByText('broken-repo')).toBeInTheDocument()
  })

  // Pulsante Aggiungi presente
  it('shows Add button in the header', () => {
    mockList.mockResolvedValue([])
    renderPage()
    expect(screen.getByRole('button', { name: /aggiungi/i })).toBeInTheDocument()
  })

  // Score visualizzato
  it('shows quality score for repositories with completed analysis', async () => {
    mockList.mockResolvedValue([repoCompleted])
    renderPage()
    await waitFor(() => expect(screen.getByText('85')).toBeInTheDocument(), { timeout: 2000 })
  })

  // TU-5.5 — consultabilità risultati: il report è accessibile dalla lista
  it('shows repository name and quality score from the list', async () => {
    mockList.mockResolvedValue([repoCompleted])
    renderPage()
    await waitFor(() => expect(screen.getByText('good-repo')).toBeInTheDocument(), { timeout: 2000 })
    expect(screen.getByText('85')).toBeInTheDocument()
  })

  // TU-5.4 — funzionamento comando Riprova: click avvia nuovo tentativo di caricamento
  it('calls the list API again when the Riprova button is clicked', async () => {
    mockList.mockRejectedValueOnce(new Error('Network error'))
    mockList.mockResolvedValue([])
    renderPage()
    await waitFor(() => expect(screen.getByRole('button', { name: /riprova/i })).toBeInTheDocument(), { timeout: 2000 })
    const riprovaBtn = screen.getByRole('button', { name: /riprova/i })
    fireEvent.click(riprovaBtn)
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2), { timeout: 2000 })
  })
})
