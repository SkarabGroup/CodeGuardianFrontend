import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { HistoryPage } from '@/pages/HistoryPage'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = vi.hoisted(() => vi.fn())
const mockGetHistory = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/api/analysis', () => ({
  analysisApi: {
    getHistory: mockGetHistory,
    exportReport: vi.fn(),
    updateRemediationDecision: vi.fn(),
  },
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

const emptyResponse = { items: [], totalPages: 1 }

function renderPage() {
  return render(
    <MemoryRouter>
      <HistoryPage />
    </MemoryRouter>,
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('HistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetHistory.mockResolvedValue(emptyResponse)
  })

  // TU-7.1 — selezione intervallo temporale tramite input di data
  it('renders two date filter inputs', async () => {
    const { container } = renderPage()
    await waitFor(() => expect(mockGetHistory).toHaveBeenCalled())
    const dateInputs = container.querySelectorAll('input[type="date"]')
    expect(dateInputs).toHaveLength(2)
  })

  // TU-7.2 — pulsante reset visibile quando date impostate
  it('shows reset button (AZZERA) when a date is set', async () => {
    const { container } = renderPage()
    await waitFor(() => expect(mockGetHistory).toHaveBeenCalled())
    const [startInput] = container.querySelectorAll('input[type="date"]')
    fireEvent.change(startInput, { target: { value: '2025-01-01' } })
    expect(screen.getByText('AZZERA')).toBeInTheDocument()
  })

  // TU-7.4 — data inizio successiva alla data fine
  it('shows error when start date is after end date', async () => {
    const { container } = renderPage()
    await waitFor(() => expect(mockGetHistory).toHaveBeenCalled())
    const [startInput, endInput] = container.querySelectorAll('input[type="date"]')
    fireEvent.change(endInput, { target: { value: '2025-01-01' } })
    fireEvent.change(startInput, { target: { value: '2025-12-01' } })
    await waitFor(() =>
      expect(
        screen.getByText(/la data di inizio deve essere precedente/i),
      ).toBeInTheDocument(),
    )
  })

  // TU-7.5 — intervallo supera 12 mesi
  it('shows error when date range exceeds 12 months', async () => {
    const { container } = renderPage()
    await waitFor(() => expect(mockGetHistory).toHaveBeenCalled())
    const [startInput, endInput] = container.querySelectorAll('input[type="date"]')
    fireEvent.change(startInput, { target: { value: '2024-01-01' } })
    fireEvent.change(endInput, { target: { value: '2025-03-01' } }) // 14 months
    await waitFor(() =>
      expect(screen.getByText(/non può superare 12 mesi/i)).toBeInTheDocument(),
    )
  })

  // TU-7.6 — lista vuota quando nessuna analisi
  it('shows empty state message when no analyses exist', async () => {
    mockGetHistory.mockResolvedValue(emptyResponse)
    renderPage()
    await waitFor(() =>
      expect(screen.getByText('Nessuna analisi')).toBeInTheDocument(),
    )
  })

  // Lista vuota con filtri — messaggio specifico per periodo senza dati
  it('shows period-specific message when filter returns no results', async () => {
    mockGetHistory.mockResolvedValue(emptyResponse)
    const { container } = renderPage()
    await waitFor(() => expect(mockGetHistory).toHaveBeenCalled())
    const [startInput, endInput] = container.querySelectorAll('input[type="date"]')
    fireEvent.change(startInput, { target: { value: '2024-01-01' } })
    fireEvent.change(endInput, { target: { value: '2024-02-01' } })
    await waitFor(() =>
      expect(screen.getByText(/nessuna analisi nel periodo selezionato/i)).toBeInTheDocument(),
    )
  })

  // Intestazioni colonne visibili con dati
  it('shows column headers when analyses are present', async () => {
    mockGetHistory.mockResolvedValue({
      items: [
        {
          id: '1',
          date: '2025-01-01T12:00:00.000Z',
          status: 'completed',
          repositoryId: 'r1',
          repositoryName: 'my-repo',
          report: { qualityScore: 85, securityScore: 90, documentationScore: 70 },
        },
      ],
      totalPages: 1,
    })
    renderPage()
    await waitFor(() => expect(screen.getByText(/qualità/i)).toBeInTheDocument())
    expect(screen.getByText(/sicurezza/i)).toBeInTheDocument()
  })
})
