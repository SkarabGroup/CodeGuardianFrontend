import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { RemediationList } from '@/pages/RepositoryDetailPage'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockUpdateRemediationDecision = vi.hoisted(() => vi.fn())

vi.mock('@/api/repositories', () => ({
  repositoriesApi: {
    get: vi.fn(),
    getHistory: vi.fn().mockResolvedValue({ items: [], totalPages: 1 }),
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
    startAnalysis: vi.fn(),
    getRanking: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('@/api/analysis', () => ({
  analysisApi: {
    updateRemediationDecision: mockUpdateRemediationDecision,
    exportReport: vi.fn(),
    getHistory: vi.fn().mockResolvedValue({ items: [], totalPages: 1 }),
  },
}))

vi.mock('@/hooks/useAnalysisPolling', () => ({
  useAnalysisPolling: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => vi.fn(), useParams: () => ({ id: 'repo-123' }) }
})

vi.mock('recharts', () => ({
  LineChart:           ({ children }: any) => <div>{children}</div>,
  Line:                () => null,
  XAxis:               () => null,
  YAxis:               () => null,
  CartesianGrid:       () => null,
  Tooltip:             () => null,
  Legend:              () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const pendingRem = {
  id: 'rem-1',
  title: 'Fix SQL Injection',
  description: 'Parameterize the query to prevent injection',
  severity: 'critical' as const,
  category: 'Security',
  reason: 'CVE-2021-1234 — unsanitized input reaches SQL query',
}

const pendingOwaspRem = {
  id: 'rem-2',
  title: 'Validate user input',
  description: 'Enforce input validation for all user-supplied data',
  severity: 'warning' as const,
  category: 'OWASP A03',
  reason: 'Improper input validation leads to injection attacks',
}

const acceptedRem = { ...pendingRem, id: 'rem-3', decision: 'accepted' as const }
const rejectedRem = { ...pendingRem, id: 'rem-4', decision: 'rejected' as const }

const remWithCode = {
  ...pendingRem,
  id: 'rem-5',
  currentCode:   'query = "SELECT * FROM users WHERE id = " + id',
  suggestedCode: 'query = "SELECT * FROM users WHERE id = ?"',
}

function renderList(remediations: any[], onDecisionUpdate = vi.fn()) {
  return render(
    <RemediationList
      remediations={remediations}
      analysisId="analysis-1"
      onDecisionUpdate={onDecisionUpdate}
    />,
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RemediationList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateRemediationDecision.mockResolvedValue({})
  })

  // TU-16.1 / TU-30.1 — caricamento dettaglio remediation
  it('renders remediation title when list is not empty', () => {
    renderList([pendingRem])
    expect(screen.getByText('Fix SQL Injection')).toBeInTheDocument()
  })

  // TU-16.2 / TU-30.2 — campi obbligatori presenti
  it('shows title, description and category for each remediation', () => {
    renderList([pendingRem])
    expect(screen.getByText('Fix SQL Injection')).toBeInTheDocument()
    expect(screen.getByText('Parameterize the query to prevent injection')).toBeInTheDocument()
    expect(screen.getByText('Security')).toBeInTheDocument()
  })

  // Mostra totale suggerimenti al singolare e plurale
  it('shows "1 SUGGERIMENTO" for a single remediation', () => {
    renderList([pendingRem])
    expect(screen.getByText('1 SUGGERIMENTO')).toBeInTheDocument()
  })

  it('shows "2 SUGGERIMENTI" for two remediations', () => {
    renderList([pendingRem, pendingOwaspRem])
    expect(screen.getByText('2 SUGGERIMENTI')).toBeInTheDocument()
  })

  // Lista vuota
  it('shows "Nessuna remediation suggerita" when the list is empty', () => {
    renderList([])
    expect(screen.getByText('Nessuna remediation suggerita')).toBeInTheDocument()
  })

  // TU-16.3 / TU-10.2 — link CVE nel reason
  it('shows CVE link when the reason contains a CVE identifier', () => {
    renderList([pendingRem])
    expect(screen.getByText('CVE-2021-1234')).toBeInTheDocument()
  })

  // TU-10.3 — link OWASP quando la categoria contiene OWASP-Axx
  it('shows OWASP Top 10 link when category matches OWASP pattern', () => {
    renderList([pendingOwaspRem])
    expect(screen.getByText(/OWASP Top 10/i)).toBeInTheDocument()
  })

  // currentCode / suggestedCode (TU-6.14 — espansione dettaglio)
  it('shows current code and suggested code blocks when present', () => {
    renderList([remWithCode])
    expect(screen.getByText(/CODICE ATTUALE/i)).toBeInTheDocument()
    expect(screen.getByText(/CODICE SUGGERITO/i)).toBeInTheDocument()
  })

  // TU-38.1 / TU-38.2 — bottone accetta per remediation pending
  it('shows accept and reject buttons for a pending remediation', () => {
    renderList([pendingRem])
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(2) // accept + reject
  })

  // TU-38.3 / TU-38.6 — accettazione: chiama API e mostra toast
  it('calls updateRemediationDecision with "accepted" and fires success toast', async () => {
    const { toast } = await import('sonner')
    const onDecisionUpdate = vi.fn()
    renderList([pendingRem], onDecisionUpdate)
    const [acceptBtn] = screen.getAllByRole('button')
    fireEvent.click(acceptBtn)
    await waitFor(() => expect(mockUpdateRemediationDecision).toHaveBeenCalledWith('analysis-1', 'rem-1', 'accepted'))
    await waitFor(() => expect(toast.success).toHaveBeenCalled())
    expect(onDecisionUpdate).toHaveBeenCalled()
  })

  // TU-38.4 / TU-38.5 / TU-38.6 — rifiuto: chiama API e mostra toast
  it('calls updateRemediationDecision with "rejected" and fires success toast', async () => {
    const { toast } = await import('sonner')
    renderList([pendingRem])
    const [, rejectBtn] = screen.getAllByRole('button')
    fireEvent.click(rejectBtn)
    await waitFor(() => expect(mockUpdateRemediationDecision).toHaveBeenCalledWith('analysis-1', 'rem-1', 'rejected'))
    await waitFor(() => expect(toast.success).toHaveBeenCalled())
  })

  // TU-38.5 — badge "Accettata" per remediation già accettata
  it('shows "Accettata" badge for an already accepted remediation', () => {
    renderList([acceptedRem])
    expect(screen.getByText('Accettata')).toBeInTheDocument()
  })

  // TU-38.5 — badge "Rifiutata" per remediation già rifiutata
  it('shows "Rifiutata" badge for an already rejected remediation', () => {
    renderList([rejectedRem])
    expect(screen.getByText('Rifiutata')).toBeInTheDocument()
  })

  // Errore API — mostra toast di errore
  it('shows error toast when updateRemediationDecision fails', async () => {
    const { toast } = await import('sonner')
    mockUpdateRemediationDecision.mockRejectedValueOnce(new Error('server error'))
    renderList([pendingRem])
    const [acceptBtn] = screen.getAllByRole('button')
    fireEvent.click(acceptBtn)
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
  })

  // Bottone disabilitato durante aggiornamento
  it('disables buttons while a decision is being processed', async () => {
    mockUpdateRemediationDecision.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 200)))
    renderList([pendingRem])
    const [acceptBtn, rejectBtn] = screen.getAllByRole('button')
    fireEvent.click(acceptBtn)
    await waitFor(() => expect(acceptBtn).toBeDisabled())
    await waitFor(() => expect(rejectBtn).toBeDisabled())
  })
})
