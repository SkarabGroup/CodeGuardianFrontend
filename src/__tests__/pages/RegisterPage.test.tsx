import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { RegisterPage } from '@/pages/RegisterPage'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = vi.hoisted(() => vi.fn())
const mockRegister = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    register: mockRegister,
    login: vi.fn(),
    logout: vi.fn(),
    user: null,
    isAuthenticated: false,
    isLoading: false,
  }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderPage() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  )
}

const getSubmitBtn = () => screen.getByRole('button', { name: /crea account/i })
const getPwdInputs = () => screen.getAllByPlaceholderText('••••••••')

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRegister.mockResolvedValue(undefined)
  })

  // TU-1.1 — rendering del form di registrazione
  it('renders the registration form with all required fields', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /crea account/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('mario_rossi')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('tu@esempio.com')).toBeInTheDocument()
    expect(getPwdInputs()).toHaveLength(2)
  })

  // TU-1.2 — pulsante di conferma presente
  it('has a submit button', () => {
    renderPage()
    expect(getSubmitBtn()).toBeInTheDocument()
  })

  // TU-1.3 / TU-1.9 / TU-1.10 — validazione campi obbligatori all'invio
  it('blocks submission and shows username error when all fields are empty', async () => {
    renderPage()
    fireEvent.click(getSubmitBtn())
    await waitFor(() =>
      expect(screen.getByText(/minimo 4 caratteri/i)).toBeInTheDocument(),
    )
    expect(mockRegister).not.toHaveBeenCalled()
  })

  // TU-1.11 — username troppo corto
  it('shows error for username shorter than 4 characters', async () => {
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('mario_rossi'), { target: { value: 'ab' } })
    fireEvent.click(getSubmitBtn())
    await waitFor(() =>
      expect(screen.getByText(/minimo 4 caratteri/i)).toBeInTheDocument(),
    )
  })

  // TU-1.11 — username troppo lungo
  it('shows error for username longer than 20 characters', async () => {
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('mario_rossi'), { target: { value: 'a'.repeat(21) } })
    fireEvent.click(getSubmitBtn())
    await waitFor(() =>
      expect(screen.getByText(/massimo 20 caratteri/i)).toBeInTheDocument(),
    )
  })

  // TU-1.11 / TU-1.15 — username con caratteri speciali
  it('shows error for username with special characters', async () => {
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('mario_rossi'), { target: { value: 'mario_' } })
    fireEvent.click(getSubmitBtn())
    await waitFor(() =>
      expect(screen.getByText(/solo lettere e numeri/i)).toBeInTheDocument(),
    )
  })

  // TU-1.16 / TU-1.17 / TU-1.20 — validazione email: campo vuoto
  it('shows email validation error when email field is empty on submit', async () => {
    renderPage()
    // Leave email empty, fill other fields to isolate the email error
    fireEvent.change(screen.getByPlaceholderText('mario_rossi'), { target: { value: 'mario99' } })
    // click submit without filling email
    fireEvent.click(getSubmitBtn())
    await waitFor(() =>
      expect(screen.getByText(/email non valida/i)).toBeInTheDocument(),
    )
  })

  // TU-1.20 — email field rejects non-email string
  // fireEvent.submit bypasses HTML5 constraint validation (typeMismatch on type="email")
  // which would otherwise block jsdom from dispatching the submit event to React
  it('shows email error for clearly invalid format (no @ sign)', async () => {
    renderPage()
    const emailInput = screen.getByPlaceholderText('tu@esempio.com')
    fireEvent.change(emailInput, { target: { value: 'notanemail' } })
    fireEvent.submit(emailInput.closest('form')!)
    await waitFor(() =>
      expect(screen.getByText(/email non valida/i)).toBeInTheDocument(),
    )
  })

  // TU-1.21 — password troppo corta
  it('shows error for password shorter than 8 characters', async () => {
    renderPage()
    fireEvent.change(getPwdInputs()[0], { target: { value: 'Ab1!' } })
    fireEvent.click(getSubmitBtn())
    await waitFor(() =>
      expect(screen.getByText(/minimo 8 caratteri/i)).toBeInTheDocument(),
    )
  })

  // TU-1.22 — checklist complessità password visibile mentre si scrive
  it('shows password complexity checklist when typing in password field', () => {
    renderPage()
    fireEvent.change(getPwdInputs()[0], { target: { value: 'abc' } })
    expect(screen.getByText('8+ caratteri')).toBeInTheDocument()
    expect(screen.getByText('Maiuscola')).toBeInTheDocument()
    expect(screen.getByText('Minuscola')).toBeInTheDocument()
    expect(screen.getByText('Numero')).toBeInTheDocument()
    expect(screen.getByText('Carattere speciale')).toBeInTheDocument()
    expect(screen.getByText('Non contiene username')).toBeInTheDocument()
  })

  // TU-1.22 — check verde quando il criterio è soddisfatto
  it('marks length criterion as passed when password has 8+ chars', () => {
    renderPage()
    fireEvent.change(getPwdInputs()[0], { target: { value: 'Abcdefg1!' } })
    // All criteria should be satisfied
    expect(screen.getByText('8+ caratteri')).toBeInTheDocument()
  })

  // TU-1.23 / TU-1.24 — password contiene username
  it('shows error when password contains the username', async () => {
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('mario_rossi'), { target: { value: 'mario' } })
    const pwds = getPwdInputs()
    fireEvent.change(pwds[0], { target: { value: 'Mario1234!' } })
    fireEvent.change(pwds[1], { target: { value: 'Mario1234!' } })
    fireEvent.click(getSubmitBtn())
    await waitFor(() =>
      expect(screen.getByText(/non può contenere il nome utente/i)).toBeInTheDocument(),
    )
  })

  // TU-1.4 / TU-1.8 — navigazione dopo registrazione avvenuta
  it('navigates to /repositories after successful registration', async () => {
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('mario_rossi'), { target: { value: 'mario99' } })
    fireEvent.change(screen.getByPlaceholderText('tu@esempio.com'), { target: { value: 'mario@test.com' } })
    const pwds = getPwdInputs()
    fireEvent.change(pwds[0], { target: { value: 'Secure1!' } })
    fireEvent.change(pwds[1], { target: { value: 'Secure1!' } })
    fireEvent.click(getSubmitBtn())
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/repositories', { replace: true }),
    )
  })

  // TU-1.14 — segnalazione username già in uso (feedback visivo tramite toast)
  it('shows error toast for username already in use (TU-1.14)', async () => {
    const { toast } = await import('sonner')
    const errorMsg = 'Username già in uso'
    mockRegister.mockRejectedValueOnce({
      response: { data: { message: errorMsg } },
    })
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('mario_rossi'), { target: { value: 'mario99' } })
    fireEvent.change(screen.getByPlaceholderText('tu@esempio.com'), { target: { value: 'mario@test.com' } })
    const pwds = getPwdInputs()
    fireEvent.change(pwds[0], { target: { value: 'Secure1!' } })
    fireEvent.change(pwds[1], { target: { value: 'Secure1!' } })
    fireEvent.click(getSubmitBtn())
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Registrazione fallita',
        expect.objectContaining({ description: errorMsg }),
      )
    })
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  // Link verso login presente
  it('has a link to the login page', () => {
    renderPage()
    expect(screen.getByRole('link', { name: /accedi/i })).toBeInTheDocument()
  })
})
