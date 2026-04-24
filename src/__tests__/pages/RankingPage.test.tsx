import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { RankingPage } from '@/pages/RankingPage'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = vi.hoisted(() => vi.fn())
const mockGetRanking = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/api/repositories', () => ({
  repositoriesApi: {
    getRanking: mockGetRanking,
    list: vi.fn().mockResolvedValue([]),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    startAnalysis: vi.fn(),
    getHistory: vi.fn().mockResolvedValue({ items: [], totalPages: 1 }),
  },
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockRanking = [
  {
    rank: 1,
    repository: { id: 'r1', name: 'alpha-repo', url: 'https://github.com/org/alpha-repo' },
    score: 92,
    lastAnalyzed: '2025-04-01T00:00:00.000Z',
    scoreDelta: 5,
  },
  {
    rank: 2,
    repository: { id: 'r2', name: 'beta-repo', url: 'https://github.com/org/beta-repo' },
    score: 78,
    lastAnalyzed: '2025-03-15T00:00:00.000Z',
    scoreDelta: -3,
  },
]

function renderPage() {
  return render(
    <MemoryRouter>
      <RankingPage />
    </MemoryRouter>,
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RankingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // TU-12.4 — rendering lista vuota in assenza di analisi completate
  it('shows empty state when ranking is empty', async () => {
    mockGetRanking.mockResolvedValue([])
    renderPage()
    await waitFor(() =>
      expect(screen.getByText('Classifica vuota')).toBeInTheDocument(),
    )
    expect(
      screen.getByText(/analizza i tuoi repository per vederli in classifica/i),
    ).toBeInTheDocument()
  })

  // TU-12.3 — esposizione dati per riga: posizione, nome, score
  it('renders repository name and score for each entry', async () => {
    mockGetRanking.mockResolvedValue(mockRanking)
    renderPage()
    await waitFor(() =>
      expect(screen.getByText('alpha-repo')).toBeInTheDocument(),
    )
    expect(screen.getByText('beta-repo')).toBeInTheDocument()
    // Scores
    expect(screen.getByText('92')).toBeInTheDocument()
    expect(screen.getByText('78')).toBeInTheDocument()
  })

  // TU-12.2 — ordine decrescente per score (rank 1 = top)
  it('shows rank 1 entry first (highest score first)', async () => {
    mockGetRanking.mockResolvedValue(mockRanking)
    renderPage()
    await waitFor(() => expect(screen.getByText('alpha-repo')).toBeInTheDocument())
    const names = screen.getAllByText(/alpha-repo|beta-repo/)
    expect(names[0].textContent).toBe('alpha-repo')
  })

  // scoreDelta positivo
  it('shows positive score delta indicator', async () => {
    mockGetRanking.mockResolvedValue(mockRanking)
    renderPage()
    await waitFor(() => expect(screen.getByText('+5')).toBeInTheDocument())
  })

  // scoreDelta negativo
  it('shows negative score delta indicator', async () => {
    mockGetRanking.mockResolvedValue(mockRanking)
    renderPage()
    await waitFor(() => expect(screen.getByText('-3')).toBeInTheDocument())
  })

  // Errore API
  it('shows error toast when ranking fails to load', async () => {
    const { toast } = await import('sonner')
    mockGetRanking.mockRejectedValue(new Error('Network error'))
    renderPage()
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
  })

  // Intestazioni colonne visibili con dati
  it('shows column headers when ranking has data', async () => {
    mockGetRanking.mockResolvedValue(mockRanking)
    renderPage()
    await waitFor(() => expect(screen.getByText('REPOSITORY')).toBeInTheDocument())
    expect(screen.getByText('SCORE')).toBeInTheDocument()
  })
})
