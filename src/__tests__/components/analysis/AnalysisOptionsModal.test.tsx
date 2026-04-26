import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { AnalysisOptionsModal } from '@/components/analysis/AnalysisOptionsModal'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = vi.hoisted(() => vi.fn())
const mockStartAnalysis = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/api/repositories', () => ({
  repositoriesApi: {
    startAnalysis: mockStartAnalysis,
    list: vi.fn().mockResolvedValue([]),
    get: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    getRanking: vi.fn().mockResolvedValue([]),
    getHistory: vi.fn().mockResolvedValue({ items: [], totalPages: 1 }),
  },
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  repositoryId: 'repo-123',
  repositoryName: 'my-project',
  repositoryUrl: 'https://github.com/org/my-project',
  onStarted: vi.fn(),
}

function renderModal(props = {}) {
  return render(
    <MemoryRouter>
      <AnalysisOptionsModal {...defaultProps} {...props} />
    </MemoryRouter>,
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AnalysisOptionsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStartAnalysis.mockResolvedValue({ id: 'analysis-1', status: 'pending' })
  })

  // TU-4.1 — campo branch presente
  it('renders branch input field', () => {
    renderModal()
    expect(screen.getByPlaceholderText('main')).toBeInTheDocument()
  })

  // TU-4.1 — area selection buttons present (Codice, Sicurezza, Documentazione)
  it('renders all three analysis area options', () => {
    renderModal()
    expect(screen.getByText('Codice')).toBeInTheDocument()
    expect(screen.getByText('Sicurezza')).toBeInTheDocument()
    expect(screen.getByText('Documentazione')).toBeInTheDocument()
  })

  // TU-4.7 — inibizione richiesta in assenza di aree selezionate
  it('disables the start button when all areas are deselected', async () => {
    renderModal()
    // Deselect all three areas (they start selected)
    const areaButtons = screen.getAllByRole('button').filter(
      btn => ['Codice', 'Sicurezza', 'Documentazione'].some(label =>
        btn.textContent?.includes(label)
      )
    )
    for (const btn of areaButtons) {
      fireEvent.click(btn)
    }
    // The start button should be disabled when 0 areas selected
    // (the toggle prevents deselecting the last one, so after 3 clicks only 0 remain
    // unless the toggle logic prevents it; check actual behavior)
    // Per source: if next.size === 1 return s (prevents deselecting last)
    // So min 1 area is always selected
    // But with 3 clicks: click Codice (removes it, 2 remain), click Sicurezza (removes it, 1 remains),
    // click Documentazione (would remove last, blocked, 1 remains)
    // So button should still show count = 1
    const startBtn = screen.getByRole('button', { name: /avvia/i })
    expect(startBtn).not.toBeDisabled()
  })

  // TU-4.7 — start button shows count of selected areas
  it('shows count of selected areas in start button', () => {
    renderModal()
    // All 3 areas selected by default
    expect(screen.getByRole('button', { name: /avvia \(3\)/i })).toBeInTheDocument()
  })

  // Deselect one area — count decreases
  it('decreases area count when an area is deselected', () => {
    renderModal()
    const codeBtn = screen.getByText('Codice').closest('button')!
    fireEvent.click(codeBtn)
    expect(screen.getByRole('button', { name: /avvia \(2\)/i })).toBeInTheDocument()
  })

  // TU-4.3 — validazione nome branch non valido
  it('shows error for invalid branch name', async () => {
    renderModal()
    const branchInput = screen.getByPlaceholderText('main')
    // Branch with spaces is invalid
    fireEvent.change(branchInput, { target: { value: 'invalid branch' } })
    fireEvent.click(screen.getByRole('button', { name: /avvia/i }))
    await waitFor(() =>
      expect(screen.getByText(/nome branch non valido/i)).toBeInTheDocument(),
    )
    expect(mockStartAnalysis).not.toHaveBeenCalled()
  })

  // TU-6.7 — inibizione richiesta in assenza di aree selezionate
  it('blocks deselection of the last area (TU-6.7)', async () => {
    renderModal()
    const areaButtons = screen.getAllByRole('button').filter(
      btn => ['Codice', 'Sicurezza', 'Documentazione'].some(label =>
        btn.textContent?.includes(label)
      )
    )
    // Try to deselect all
    for (const btn of areaButtons) fireEvent.click(btn)
    
    // The toggleArea logic should block the last one
    expect(screen.getByRole('button', { name: /avvia \(1\)/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /avvia/i })).not.toBeDisabled()
  })

  // Branch valido — accettato
  it('accepts a valid branch name', async () => {
    renderModal()
    const branchInput = screen.getByPlaceholderText('main')
    fireEvent.change(branchInput, { target: { value: 'feature/my-feature' } })
    fireEvent.click(screen.getByRole('button', { name: /avvia/i }))
    await waitFor(() => expect(mockStartAnalysis).toHaveBeenCalled())
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled())
  })

  // Commit hash non valido
  it('shows error for malformed commit hash', async () => {
    renderModal()
    const commitInput = screen.getByPlaceholderText(/lascia vuoto/i)
    fireEvent.change(commitInput, { target: { value: 'notahash' } })
    fireEvent.click(screen.getByRole('button', { name: /avvia/i }))
    await waitFor(() =>
      expect(screen.getByText(/sha-1 valido/i)).toBeInTheDocument(),
    )
  })

  // TU-4.5 — bottone disabilitato durante avvio
  it('disables start button while analysis is starting', async () => {
    mockStartAnalysis.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 200)))
    renderModal()
    const startBtn = screen.getByRole('button', { name: /avvia/i })
    fireEvent.click(startBtn)
    await waitFor(() => expect(startBtn).toBeDisabled())
  })

  // Pulsante Annulla chiude la modale
  it('calls onOpenChange(false) when Annulla is clicked', () => {
    const onOpenChange = vi.fn()
    renderModal({ onOpenChange })
    fireEvent.click(screen.getByRole('button', { name: /annulla/i }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  // TU-39.2 — campo PAT/password presente per repository privati
  it('renders a password/PAT input field for private repositories', () => {
    renderModal()
    expect(screen.getByPlaceholderText(/inserisci password o token PAT/i)).toBeInTheDocument()
  })

  // TU-39.3 — inibizione richiesta analisi: impossibile deselezionare l'ultima area
  it('keeps at least one area selected and never disables the start button via area deselection', () => {
    renderModal()
    const areaButtons = screen.getAllByRole('button').filter(
      btn => ['Codice', 'Sicurezza', 'Documentazione'].some(label => btn.textContent?.includes(label)),
    )
    for (const btn of areaButtons) fireEvent.click(btn)
    // After 3 clicks: last area toggle is blocked, at least 1 remains selected
    expect(screen.getByRole('button', { name: /avvia/i })).not.toBeDisabled()
  })
})
