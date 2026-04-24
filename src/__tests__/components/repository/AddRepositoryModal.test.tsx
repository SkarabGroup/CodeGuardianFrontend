import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { AddRepositoryModal } from '@/components/repository/AddRepositoryModal'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockCreate = vi.hoisted(() => vi.fn())

vi.mock('@/api/repositories', () => ({
  repositoriesApi: {
    create: mockCreate,
    list: vi.fn().mockResolvedValue([]),
    get: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getRanking: vi.fn().mockResolvedValue([]),
    startAnalysis: vi.fn(),
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
  onCreated: vi.fn(),
}

function renderModal(props = {}) {
  return render(<AddRepositoryModal {...defaultProps} {...props} />)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AddRepositoryModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // TU-20.2 — campo nome presente
  it('renders the name input field', () => {
    renderModal()
    expect(screen.getByPlaceholderText('my-project')).toBeInTheDocument()
  })

  // TU-20.4 — campo URL presente
  it('renders the GitHub URL input field', () => {
    renderModal()
    expect(screen.getByPlaceholderText('https://github.com/org/repo')).toBeInTheDocument()
  })

  // TU-20.1 — blocco invio con campi obbligatori vuoti
  it('blocks submission and shows error when name is empty', async () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: /aggiungi/i }))
    await waitFor(() =>
      expect(screen.getByText(/nome obbligatorio/i)).toBeInTheDocument(),
    )
    expect(mockCreate).not.toHaveBeenCalled()
  })

  // TU-20.5 — URL sintatticamente non valido
  it('shows error for syntactically invalid URL', async () => {
    renderModal()
    fireEvent.change(screen.getByPlaceholderText('my-project'), { target: { value: 'my-repo' } })
    fireEvent.change(screen.getByPlaceholderText('https://github.com/org/repo'), { target: { value: 'not-a-url' } })
    fireEvent.click(screen.getByRole('button', { name: /aggiungi/i }))
    await waitFor(() =>
      expect(screen.getByText(/url non valido/i)).toBeInTheDocument(),
    )
    expect(mockCreate).not.toHaveBeenCalled()
  })

  // TU-20.6 — URL non è di GitHub
  it('shows error for non-GitHub URL', async () => {
    renderModal()
    fireEvent.change(screen.getByPlaceholderText('my-project'), { target: { value: 'my-repo' } })
    fireEvent.change(
      screen.getByPlaceholderText('https://github.com/org/repo'),
      { target: { value: 'https://gitlab.com/org/repo' } },
    )
    fireEvent.click(screen.getByRole('button', { name: /aggiungi/i }))
    await waitFor(() =>
      expect(screen.getByText(/deve essere un url github/i)).toBeInTheDocument(),
    )
    expect(mockCreate).not.toHaveBeenCalled()
  })

  // Invio con dati validi — chiama create e onCreated
  it('calls create API and onCreated on successful submission', async () => {
    const createdRepo = {
      id: 'r1',
      name: 'my-repo',
      url: 'https://github.com/org/my-repo',
    }
    mockCreate.mockResolvedValue(createdRepo)
    const onCreated = vi.fn()
    renderModal({ onCreated })
    fireEvent.change(screen.getByPlaceholderText('my-project'), { target: { value: 'my-repo' } })
    fireEvent.change(
      screen.getByPlaceholderText('https://github.com/org/repo'),
      { target: { value: 'https://github.com/org/my-repo' } },
    )
    fireEvent.click(screen.getByRole('button', { name: /aggiungi/i }))
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(createdRepo))
  })

  // Repository già presente — toast di errore specifico
  it('shows "already present" error when repository already exists', async () => {
    const { toast } = await import('sonner')
    mockCreate.mockRejectedValue(new Error('already exists'))
    renderModal()
    fireEvent.change(screen.getByPlaceholderText('my-project'), { target: { value: 'my-repo' } })
    fireEvent.change(
      screen.getByPlaceholderText('https://github.com/org/repo'),
      { target: { value: 'https://github.com/org/my-repo' } },
    )
    fireEvent.click(screen.getByRole('button', { name: /aggiungi/i }))
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
  })

  // Pulsante Annulla chiude la modale
  it('calls onOpenChange(false) when Annulla is clicked', () => {
    const onOpenChange = vi.fn()
    renderModal({ onOpenChange })
    fireEvent.click(screen.getByRole('button', { name: /annulla/i }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  // Bottone submit disabilitato durante invio
  it('disables submit button while creating', async () => {
    mockCreate.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 200)))
    renderModal()
    fireEvent.change(screen.getByPlaceholderText('my-project'), { target: { value: 'my-repo' } })
    fireEvent.change(
      screen.getByPlaceholderText('https://github.com/org/repo'),
      { target: { value: 'https://github.com/org/my-repo' } },
    )
    const submitBtn = screen.getByRole('button', { name: /aggiungi/i })
    fireEvent.click(submitBtn)
    await waitFor(() => expect(submitBtn).toBeDisabled())
  })
})
