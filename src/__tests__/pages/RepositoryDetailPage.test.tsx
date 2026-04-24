import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { RepositoryDetailPage } from '@/pages/RepositoryDetailPage'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate   = vi.hoisted(() => vi.fn())
const mockGet        = vi.hoisted(() => vi.fn())
const mockGetHistory = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate, useParams: () => ({ id: 'repo-123' }) }
})

vi.mock('@/api/repositories', () => ({
  repositoriesApi: {
    get:          mockGet,
    getHistory:   mockGetHistory,
    list:         vi.fn().mockResolvedValue([]),
    create:       vi.fn(),
    delete:       vi.fn(),
    update:       vi.fn(),
    startAnalysis: vi.fn(),
    getRanking:   vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('@/api/analysis', () => ({
  analysisApi: {
    exportReport:              vi.fn(),
    updateRemediationDecision: vi.fn(),
    getHistory:                vi.fn().mockResolvedValue({ items: [], totalPages: 1 }),
  },
}))

vi.mock('@/hooks/useAnalysisPolling', () => ({
  useAnalysisPolling: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

// recharts needs DOM measurements — replace with minimal stubs
vi.mock('recharts', () => ({
  LineChart:           ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line:                () => null,
  XAxis:               () => null,
  YAxis:               () => null,
  CartesianGrid:       () => null,
  Tooltip:             () => null,
  Legend:              () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const repoNoAnalysis = {
  id: 'repo-123',
  name: 'test-repo',
  url: 'https://github.com/org/test-repo',
}

const repoRunning = {
  ...repoNoAnalysis,
  lastAnalysis: { id: 'a0', date: '2025-06-01T00:00:00.000Z', status: 'in-progress' as const },
}

const baseReport = {
  qualityScore:       85,
  securityScore:      70,
  documentationScore: 90,
  criticalIssues:     1,
  warningIssues:      2,
  infoIssues:         3,
  remediations:       [],
  codeAnalysis: {
    testCoverage:  75,
    linesAnalyzed: 500,
    issues: [
      { title: 'Unused variable', description: 'Declared but never used', severity: 'warning' as const, file: 'src/foo.ts', line: 10 },
    ],
  },
  securityAnalysis: {
    issues: [
      { title: 'SQL Injection', description: 'Potential SQL injection', severity: 'critical' as const, category: 'OWASP-A03' },
    ],
  },
  documentationAnalysis: {
    completenessScore: 90,
    coherenceScore:    85,
    issues: [],
  },
}

const repoCompleted = {
  id: 'repo-123',
  name: 'test-repo',
  url: 'https://github.com/org/test-repo',
  lastAnalysis: {
    id:     'analysis-1',
    date:   '2025-06-01T10:00:00.000Z',
    status: 'completed' as const,
    report: baseReport,
  },
}

// ── Helper ────────────────────────────────────────────────────────────────────

function renderPage() {
  return render(<MemoryRouter><RepositoryDetailPage /></MemoryRouter>)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RepositoryDetailPage', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    vi.clearAllMocks()
    user = userEvent.setup()
    mockGetHistory.mockResolvedValue({ items: [], totalPages: 1 })
  })

  // Skeleton — repo name not shown during loading
  it('does not show repository name while loading', () => {
    mockGet.mockImplementation(() => new Promise(() => {}))
    renderPage()
    expect(screen.queryByText('test-repo')).not.toBeInTheDocument()
  })

  // TU-6.1 — caricamento repo
  it('renders repository name after successful API load', async () => {
    mockGet.mockResolvedValue(repoCompleted)
    renderPage()
    await waitFor(() => expect(screen.getByText('test-repo')).toBeInTheDocument())
  })

  // TU-6.2 / 6.3 / 6.4 — errore API
  it('navigates to /repositories and shows error toast when API fails', async () => {
    const { toast } = await import('sonner')
    mockGet.mockRejectedValue(new Error('Not found'))
    renderPage()
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(mockNavigate).toHaveBeenCalledWith('/repositories')
  })

  // TU-6.12 — score card labels
  it('shows score card labels for all three analysis areas', async () => {
    mockGet.mockResolvedValue(repoCompleted)
    renderPage()
    await waitFor(() => expect(screen.getByText('QUALITÀ CODICE')).toBeInTheDocument())
    expect(screen.getByText('SICUREZZA')).toBeInTheDocument()
    expect(screen.getByText('DOCUMENTAZIONE')).toBeInTheDocument()
  })

  // Issue summary bar
  it('shows CRITICAL, WARNINGS, INFO labels in the issue summary bar', async () => {
    mockGet.mockResolvedValue(repoCompleted)
    renderPage()
    await waitFor(() => expect(screen.getByText('CRITICAL')).toBeInTheDocument())
    expect(screen.getByText('WARNINGS')).toBeInTheDocument()
    expect(screen.getByText('INFO')).toBeInTheDocument()
  })

  // TU-6.5 — tabs visibili con report disponibile
  it('shows analysis area tabs when a report is available', async () => {
    mockGet.mockResolvedValue(repoCompleted)
    renderPage()
    await waitFor(() => expect(screen.getByRole('tab', { name: /codice/i })).toBeInTheDocument())
    expect(screen.getByRole('tab', { name: /sicurezza/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /documentazione/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /storico/i })).toBeInTheDocument()
  })

  // TU-6.6 — switching tab: Sicurezza
  it('activates the Sicurezza tab when clicked', async () => {
    mockGet.mockResolvedValue(repoCompleted)
    renderPage()
    const secTab = await screen.findByRole('tab', { name: /sicurezza/i })
    await user.click(secTab)
    await waitFor(() => expect(secTab).toHaveAttribute('data-state', 'active'))
  })

  // TU-9.1 — sezione codice caricata (tab default)
  it('shows code issues in the default Codice tab', async () => {
    mockGet.mockResolvedValue(repoCompleted)
    renderPage()
    await waitFor(() => expect(screen.getByText('Unused variable')).toBeInTheDocument())
  })

  // TU-9.1 — metrica COPERTURA TEST nel tab codice
  it('shows test coverage metric in the Codice tab', async () => {
    mockGet.mockResolvedValue(repoCompleted)
    renderPage()
    await waitFor(() => expect(screen.getByText('COPERTURA TEST')).toBeInTheDocument())
  })

  // TU-9.5 / TU-6.15 — nessun problema di codice
  it('shows "Nessun problema di codice rilevato" when there are no code issues', async () => {
    const repo = {
      ...repoCompleted,
      lastAnalysis: {
        ...repoCompleted.lastAnalysis,
        report: { ...baseReport, codeAnalysis: { testCoverage: 100, linesAnalyzed: 200, issues: [] } },
      },
    }
    mockGet.mockResolvedValue(repo)
    renderPage()
    await waitFor(() => expect(screen.getByText('Nessun problema di codice rilevato')).toBeInTheDocument())
  })

  // TU-10.1 — sicurezza: problemi visibili dopo click tab
  it('shows security issues after switching to the Sicurezza tab', async () => {
    mockGet.mockResolvedValue(repoCompleted)
    renderPage()
    await waitFor(() => expect(screen.getByText('test-repo')).toBeInTheDocument())
    await user.click(screen.getByRole('tab', { name: /sicurezza/i }))
    await waitFor(() => expect(screen.getByText('SQL Injection')).toBeInTheDocument())
  })

  // TU-10.1 — analisi di sicurezza non completata
  it('shows "analisi di sicurezza non completata" message when securityAnalysis is absent', async () => {
    const repo = {
      ...repoCompleted,
      lastAnalysis: {
        ...repoCompleted.lastAnalysis,
        report: { ...baseReport, securityAnalysis: undefined, securityIssues: undefined },
      },
    }
    mockGet.mockResolvedValue(repo)
    renderPage()
    await waitFor(() => expect(screen.getByText('test-repo')).toBeInTheDocument())
    await user.click(screen.getByRole('tab', { name: /sicurezza/i }))
    await waitFor(() =>
      expect(screen.getByText(/analisi di sicurezza non e' stata completata/i)).toBeInTheDocument(),
    )
  })

  // TU-11.1 — documentazione: metrica completezza
  it('shows COMPLETEZZA metric in the Documentazione tab', async () => {
    mockGet.mockResolvedValue(repoCompleted)
    renderPage()
    await waitFor(() => expect(screen.getByText('test-repo')).toBeInTheDocument())
    await user.click(screen.getByRole('tab', { name: /documentazione/i }))
    await waitFor(() => expect(screen.getByText('COMPLETEZZA')).toBeInTheDocument())
  })

  // TU-11.5 — documentazione completa
  it('shows "Documentazione completa" when no documentation issues exist', async () => {
    mockGet.mockResolvedValue(repoCompleted)
    renderPage()
    await waitFor(() => expect(screen.getByText('test-repo')).toBeInTheDocument())
    await user.click(screen.getByRole('tab', { name: /documentazione/i }))
    await waitFor(() => expect(screen.getByText('Documentazione completa')).toBeInTheDocument())
  })

  // TU-11.2 — problemi di documentazione visibili
  it('shows documentation issues when they are present', async () => {
    const repo = {
      ...repoCompleted,
      lastAnalysis: {
        ...repoCompleted.lastAnalysis,
        report: {
          ...baseReport,
          documentationAnalysis: {
            completenessScore: 60,
            issues: [{ title: 'Missing JSDoc', description: 'Function lacks documentation', severity: 'warning' as const }],
          },
        },
      },
    }
    mockGet.mockResolvedValue(repo)
    renderPage()
    await waitFor(() => expect(screen.getByText('test-repo')).toBeInTheDocument())
    await user.click(screen.getByRole('tab', { name: /documentazione/i }))
    await waitFor(() => expect(screen.getByText('Missing JSDoc')).toBeInTheDocument())
  })

  // TU-11.4 — suggerimento documentazione (suggested_fix)
  it('shows suggested fix for documentation issues that have one', async () => {
    const repo = {
      ...repoCompleted,
      lastAnalysis: {
        ...repoCompleted.lastAnalysis,
        report: {
          ...baseReport,
          documentationAnalysis: {
            completenessScore: 50,
            issues: [{
              title: 'Undocumented function',
              description: 'Add JSDoc',
              severity: 'info' as const,
              suggested_fix: '@param x - the value',
            }],
          },
        },
      },
    }
    mockGet.mockResolvedValue(repo)
    renderPage()
    await waitFor(() => expect(screen.getByText('test-repo')).toBeInTheDocument())
    await user.click(screen.getByRole('tab', { name: /documentazione/i }))
    await waitFor(() => expect(screen.getByText('@param x - the value')).toBeInTheDocument())
  })

  // Nessuna analisi disponibile
  it('shows "Nessuna analisi disponibile" when the repo has no report', async () => {
    mockGet.mockResolvedValue(repoNoAnalysis)
    renderPage()
    await waitFor(() => expect(screen.getByText('Nessuna analisi disponibile')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /analizza ora/i })).toBeInTheDocument()
  })

  // Export button
  it('shows Esporta button when a completed report is available', async () => {
    mockGet.mockResolvedValue(repoCompleted)
    renderPage()
    await waitFor(() => expect(screen.getByRole('button', { name: /esporta/i })).toBeInTheDocument())
  })

  // Export dropdown (TU-14.1 / 14.2)
  it('shows PDF and JSON options in the export dropdown', async () => {
    mockGet.mockResolvedValue(repoCompleted)
    renderPage()
    await waitFor(() => expect(screen.getByRole('button', { name: /esporta/i })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /esporta/i }))
    expect(screen.getByText('PDF')).toBeInTheDocument()
    expect(screen.getByText('JSON')).toBeInTheDocument()
  })

  // Analisi in corso
  it('shows "In corso…" and disables Analizza while analysis is running', async () => {
    mockGet.mockResolvedValue(repoRunning)
    renderPage()
    await waitFor(() => expect(screen.getByText('In corso…')).toBeInTheDocument())
  })

  // TU-8.4 — Storico tab: lista vuota
  it('shows "Nessuna analisi precedente" in the Storico tab when history is empty', async () => {
    mockGet.mockResolvedValue(repoCompleted)
    mockGetHistory.mockResolvedValue({ items: [], totalPages: 1 })
    renderPage()
    await waitFor(() => expect(screen.getByText('test-repo')).toBeInTheDocument())
    await user.click(screen.getByRole('tab', { name: /storico/i }))
    await waitFor(() => expect(screen.getByText('Nessuna analisi precedente')).toBeInTheDocument())
  })

  // TU-8.1 / 8.3 — Storico tab con dati
  it('shows history entries and "STORICO ANALISI" label in the Storico tab', async () => {
    mockGet.mockResolvedValue(repoCompleted)
    mockGetHistory.mockResolvedValue({
      items: [
        { id: 'h1', repositoryId: 'repo-123', date: '2025-05-01T00:00:00.000Z', status: 'completed' as const,
          report: { qualityScore: 80, securityScore: 75, documentationScore: 85, criticalIssues: 0, warningIssues: 1, infoIssues: 0, remediations: [] } },
      ],
      totalPages: 1,
    })
    renderPage()
    await waitFor(() => expect(screen.getByText('test-repo')).toBeInTheDocument())
    await user.click(screen.getByRole('tab', { name: /storico/i }))
    await waitFor(() => expect(screen.getByText('STORICO ANALISI')).toBeInTheDocument())
  })

  // Breadcrumb
  it('navigates to /repositories when the breadcrumb is clicked', async () => {
    mockGet.mockResolvedValue(repoCompleted)
    renderPage()
    await waitFor(() => expect(screen.getByText('test-repo')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Repository'))
    expect(mockNavigate).toHaveBeenCalledWith('/repositories')
  })
})
