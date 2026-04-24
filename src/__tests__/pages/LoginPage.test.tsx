import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { LoginPage } from '@/pages/LoginPage'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = vi.hoisted(() => vi.fn())
const mockLogin = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
    register: vi.fn(),
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
      <LoginPage />
    </MemoryRouter>,
  )
}

const getSubmitBtn = () => screen.getByRole('button', { name: /accedi/i })

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLogin.mockResolvedValue(undefined)
  })

  // TU-2.1 — rendering pagina di login
  it('renders the login form', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /accedi/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('tu@esempio.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
  })

  // TU-2.2 — pulsante di conferma presente
  it('has a submit button', () => {
    renderPage()
    expect(getSubmitBtn()).toBeInTheDocument()
  })

  // TU-2.11 — rilevamento campi mancanti, inibizione login
  it('blocks submission and shows error when email is empty', async () => {
    renderPage()
    fireEvent.click(getSubmitBtn())
    await waitFor(() =>
      expect(screen.getByText(/email non valida/i)).toBeInTheDocument(),
    )
    expect(mockLogin).not.toHaveBeenCalled()
  })

  // TU-2.3 — validazione formato email
  // fireEvent.submit bypasses HTML5 constraint validation (typeMismatch on type="email")
  // which would otherwise block jsdom from dispatching the submit event to React
  it('shows error for malformed email', async () => {
    renderPage()
    const emailInput = screen.getByPlaceholderText('tu@esempio.com')
    fireEvent.change(emailInput, { target: { value: 'notanemail' } })
    fireEvent.submit(emailInput.closest('form')!)
    await waitFor(() =>
      expect(screen.getByText(/email non valida/i)).toBeInTheDocument(),
    )
    expect(mockLogin).not.toHaveBeenCalled()
  })

  // TU-2.3 — password obbligatoria
  it('shows error when password is empty', async () => {
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('tu@esempio.com'), { target: { value: 'user@test.com' } })
    fireEvent.click(getSubmitBtn())
    await waitFor(() =>
      expect(screen.getByText(/password obbligatoria/i)).toBeInTheDocument(),
    )
    expect(mockLogin).not.toHaveBeenCalled()
  })

  // TU-2.5 — reindirizzamento verso dashboard
  it('navigates to /repositories after successful login', async () => {
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('tu@esempio.com'), { target: { value: 'user@test.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } })
    fireEvent.click(getSubmitBtn())
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/repositories', { replace: true }),
    )
  })

  // TU-2.13 / TU-2.15 — credenziali errate mostrano toast di errore
  it('shows error toast on failed login', async () => {
    const { toast } = await import('sonner')
    mockLogin.mockRejectedValueOnce(new Error('Unauthorized'))
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('tu@esempio.com'), { target: { value: 'wrong@test.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'wrongpass' } })
    fireEvent.click(getSubmitBtn())
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  // TU-2.10 — spinner durante validazione (bottone disabilitato)
  it('disables the submit button while login is in progress', async () => {
    // Make login take time so we can observe the disabled state
    mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 200)))
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('tu@esempio.com'), { target: { value: 'user@test.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } })
    fireEvent.click(getSubmitBtn())
    await waitFor(() => expect(getSubmitBtn()).toBeDisabled())
  })

  // Toggle visibilità password
  it('toggles password visibility when eye button is clicked', () => {
    renderPage()
    const pwdInput = screen.getByPlaceholderText('••••••••')
    expect(pwdInput).toHaveAttribute('type', 'password')
    const toggleBtn = screen.getByRole('button', { name: '' })
    fireEvent.click(toggleBtn)
    expect(pwdInput).toHaveAttribute('type', 'text')
  })

  // Link verso registrazione
  it('has a link to the registration page', () => {
    renderPage()
    expect(screen.getByRole('link', { name: /registrati/i })).toBeInTheDocument()
  })
})
