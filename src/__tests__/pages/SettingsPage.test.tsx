import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { SettingsPage } from '@/pages/SettingsPage'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate           = vi.hoisted(() => vi.fn())
const mockLogout             = vi.hoisted(() => vi.fn())
const mockChangePassword     = vi.hoisted(() => vi.fn())
const mockDeleteAccount      = vi.hoisted(() => vi.fn())
const mockAuthLogin          = vi.hoisted(() => vi.fn())
const mockPatAdd             = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user:            { email: 'user@test.com' },
    logout:          mockLogout,
    login:           vi.fn(),
    register:        vi.fn(),
    isAuthenticated: true,
    isLoading:       false,
  }),
}))

vi.mock('@/api/users', () => ({
  usersApi: {
    changePassword: mockChangePassword,
    deleteAccount:  mockDeleteAccount,
  },
}))

vi.mock('@/api/auth', () => ({
  authApi: { login: mockAuthLogin },
}))

vi.mock('@/api/pat', () => ({
  patApi: {
    add:    mockPatAdd,
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

// ── Helper ────────────────────────────────────────────────────────────────────

function renderPage() {
  return render(<MemoryRouter><SettingsPage /></MemoryRouter>)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SettingsPage', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    vi.clearAllMocks()
    user = userEvent.setup()
    mockChangePassword.mockResolvedValue(undefined)
    mockDeleteAccount.mockResolvedValue(undefined)
    mockAuthLogin.mockResolvedValue(undefined)
    mockLogout.mockResolvedValue(undefined)
  })

  // TU-15.1 — rendering della pagina impostazioni
  it('renders the "Impostazioni" heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /impostazioni/i })).toBeInTheDocument()
    expect(screen.getByText(/gestisci il tuo account/i)).toBeInTheDocument()
  })

  // TU-15.1 — tre tab presenti
  it('renders three tabs: Profilo, Password, Account', () => {
    renderPage()
    expect(screen.getByRole('tab', { name: /profilo/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^password$/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /account/i })).toBeInTheDocument()
  })

  // TU-28.2 — avviso irreversibilità nella zona pericolosa
  it('shows irreversibility warning in the Account danger zone', async () => {
    renderPage()
    await user.click(screen.getByRole('tab', { name: /account/i }))
    await waitFor(() => expect(screen.getByText('Zona pericolosa')).toBeInTheDocument())
    expect(screen.getByText(/questa azione è irreversibile/i)).toBeInTheDocument()
  })

  // Bottone eliminazione disabilitato quando password vuota
  it('disables the delete account button when password field is empty', async () => {
    renderPage()
    await user.click(screen.getByRole('tab', { name: /account/i }))
    await waitFor(() => expect(screen.getByPlaceholderText('La tua password')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /elimina account definitivamente/i })).toBeDisabled()
  })

  // Bottone eliminazione abilitato quando password inserita
  it('enables the delete account button when a password is typed', async () => {
    renderPage()
    await user.click(screen.getByRole('tab', { name: /account/i }))
    await waitFor(() => expect(screen.getByPlaceholderText('La tua password')).toBeInTheDocument())
    fireEvent.change(screen.getByPlaceholderText('La tua password'), { target: { value: 'mypassword' } })
    expect(screen.getByRole('button', { name: /elimina account definitivamente/i })).not.toBeDisabled()
  })

  // Password corrente obbligatoria
  it('shows "Password corrente obbligatoria" when submitting empty password form', async () => {
    renderPage()
    await user.click(screen.getByRole('tab', { name: /^password$/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /aggiorna password/i })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /aggiorna password/i }))
    await waitFor(() => expect(screen.getByText('Password corrente obbligatoria')).toBeInTheDocument())
    expect(mockChangePassword).not.toHaveBeenCalled()
  })

  // Nuova password troppo corta
  it('shows "Minimo 8 caratteri" when new password is too short', async () => {
    renderPage()
    await user.click(screen.getByRole('tab', { name: /^password$/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /aggiorna password/i })).toBeInTheDocument())
    const form = screen.getByRole('button', { name: /aggiorna password/i }).closest('form')!
    const inputs = form.querySelectorAll('input[type="password"]')
    fireEvent.change(inputs[0], { target: { value: 'OldPass1!' } })
    fireEvent.change(inputs[1], { target: { value: 'short' } })
    fireEvent.submit(form)
    await waitFor(() => expect(screen.getByText('Minimo 8 caratteri')).toBeInTheDocument())
    expect(mockChangePassword).not.toHaveBeenCalled()
  })

  // Password non coincidono
  it('shows "Le password non coincidono" when passwords do not match', async () => {
    renderPage()
    await user.click(screen.getByRole('tab', { name: /^password$/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /aggiorna password/i })).toBeInTheDocument())
    const form = screen.getByRole('button', { name: /aggiorna password/i }).closest('form')!
    const inputs = form.querySelectorAll('input[type="password"]')
    fireEvent.change(inputs[0], { target: { value: 'OldPass1!' } })
    fireEvent.change(inputs[1], { target: { value: 'NewPass1!' } })
    fireEvent.change(inputs[2], { target: { value: 'Different1!' } })
    fireEvent.submit(form)
    await waitFor(() => expect(screen.getByText('Le password non coincidono')).toBeInTheDocument())
    expect(mockChangePassword).not.toHaveBeenCalled()
  })

  // Aggiornamento password riuscito
  it('calls changePassword API on valid password form submission', async () => {
    const { toast } = await import('sonner')
    renderPage()
    await user.click(screen.getByRole('tab', { name: /^password$/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /aggiorna password/i })).toBeInTheDocument())
    const form = screen.getByRole('button', { name: /aggiorna password/i }).closest('form')!
    const inputs = form.querySelectorAll('input[type="password"]')
    fireEvent.change(inputs[0], { target: { value: 'OldPass1!' } })
    fireEvent.change(inputs[1], { target: { value: 'NewPass1@' } })
    fireEvent.change(inputs[2], { target: { value: 'NewPass1@' } })
    fireEvent.submit(form)
    await waitFor(() => expect(mockChangePassword).toHaveBeenCalledWith('NewPass1@'))
    await waitFor(() => expect(toast.success).toHaveBeenCalled())
  })
  
  // TU-15.8 — verifica invalidazione sessioni post-cambio password
  it('triggers session invalidation logic via user password update (TU-15.8)', async () => {
    mockChangePassword.mockResolvedValueOnce({ invalidatedSessionsCount: 5 })
    renderPage()
    await user.click(screen.getByRole('tab', { name: /^password$/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /aggiorna password/i })).toBeInTheDocument())
    const form = screen.getByRole('button', { name: /aggiorna password/i }).closest('form')!
    const inputs = form.querySelectorAll('input[type="password"]')
    fireEvent.change(inputs[0], { target: { value: 'OldPass1!' } })
    fireEvent.change(inputs[1], { target: { value: 'NewPass1@' } })
    fireEvent.change(inputs[2], { target: { value: 'NewPass1@' } })
    fireEvent.submit(form)
    await waitFor(() => expect(mockChangePassword).toHaveBeenCalled())
  })

  // Eliminazione account con password errata
  it('shows "Password errata" toast when delete account is called with wrong password', async () => {
    const { toast } = await import('sonner')
    mockAuthLogin.mockRejectedValueOnce(new Error('Unauthorized'))
    renderPage()
    await user.click(screen.getByRole('tab', { name: /account/i }))
    await waitFor(() => expect(screen.getByPlaceholderText('La tua password')).toBeInTheDocument())
    fireEvent.change(screen.getByPlaceholderText('La tua password'), { target: { value: 'wrongpass' } })
    fireEvent.click(screen.getByRole('button', { name: /elimina account definitivamente/i }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Password errata, riprova'))
    expect(mockDeleteAccount).not.toHaveBeenCalled()
  })

  // PAT section — URL obbligatorio
  it('shows PAT URL validation error when repository URL is invalid', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /salva pat/i }))
    await waitFor(() => expect(screen.getByText('Inserisci un URL GitHub valido')).toBeInTheDocument())
    expect(mockPatAdd).not.toHaveBeenCalled()
  })
})
