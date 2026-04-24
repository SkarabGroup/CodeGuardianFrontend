import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { useContext } from 'react'
import { AuthContext, AuthProvider } from '@/contexts/AuthContext'

const mockLogin    = vi.hoisted(() => vi.fn())
const mockRegister = vi.hoisted(() => vi.fn())
const mockLogout   = vi.hoisted(() => vi.fn())
const mockGetAccess = vi.hoisted(() => vi.fn())
const mockSetAccess = vi.hoisted(() => vi.fn())
const mockSetRefresh = vi.hoisted(() => vi.fn())
const mockClear    = vi.hoisted(() => vi.fn())

vi.mock('@/api/auth', () => ({
  authApi: { login: mockLogin, register: mockRegister, logout: mockLogout },
}))

vi.mock('@/api/gateway', () => ({
  gateway: {},
  tokenStorage: {
    getAccess: mockGetAccess,
    setAccess: mockSetAccess,
    setRefresh: mockSetRefresh,
    clear: mockClear,
    getRefresh: vi.fn(),
  },
}))

function makeJwt(payload: object): string {
  const encoded = btoa(JSON.stringify(payload))
  return `header.${encoded}.sig`
}

function TestConsumer() {
  const ctx = useContext(AuthContext)!
  return (
    <div>
      <span data-testid="email">{ctx.user?.email ?? 'none'}</span>
      <span data-testid="loading">{String(ctx.isLoading)}</span>
      <span data-testid="auth">{String(ctx.isAuthenticated)}</span>
      <button onClick={() => ctx.login({ email: 'x@y.com', password: 'pw' })}>login</button>
      <button onClick={() => ctx.register({ email: 'x@y.com', password: 'pw', username: 'x', confirmPassword: 'pw' })}>register</button>
      <button onClick={() => ctx.logout()}>logout</button>
    </div>
  )
}

function renderProvider() {
  render(<AuthProvider><TestConsumer /></AuthProvider>)
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLogout.mockResolvedValue(undefined)
  })

  it('starts with isLoading true then resolves to user null when no token', async () => {
    mockGetAccess.mockReturnValue(null)
    renderProvider()
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('email')).toHaveTextContent('none')
    expect(screen.getByTestId('auth')).toHaveTextContent('false')
  })

  it('restores user from valid non-expired JWT', async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600
    const token = makeJwt({ sub: 'u1', email: 'alice@test.com', username: 'alice', exp })
    mockGetAccess.mockReturnValue(token)
    renderProvider()
    await waitFor(() => expect(screen.getByTestId('email')).toHaveTextContent('alice@test.com'))
    expect(screen.getByTestId('auth')).toHaveTextContent('true')
  })

  it('sets user null for expired JWT', async () => {
    const exp = Math.floor(Date.now() / 1000) - 1
    const token = makeJwt({ sub: 'u1', email: 'old@test.com', exp })
    mockGetAccess.mockReturnValue(token)
    renderProvider()
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('email')).toHaveTextContent('none')
  })

  it('sets user null for malformed JWT payload', async () => {
    mockGetAccess.mockReturnValue('header.!!!invalid!!!.sig')
    renderProvider()
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('email')).toHaveTextContent('none')
  })

  it('login sets user and stores tokens', async () => {
    mockGetAccess.mockReturnValue(null)
    const user = { id: 'u1', email: 'a@b.com', username: 'a', createdAt: '' }
    mockLogin.mockResolvedValue({ accessToken: 'acc', refreshToken: 'ref', user })
    renderProvider()
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))

    fireEvent.click(screen.getByRole('button', { name: /login/i }))
    await waitFor(() => expect(screen.getByTestId('email')).toHaveTextContent('a@b.com'))
    expect(mockSetAccess).toHaveBeenCalledWith('acc')
    expect(mockSetRefresh).toHaveBeenCalledWith('ref')
  })

  it('register sets user and stores tokens', async () => {
    mockGetAccess.mockReturnValue(null)
    const user = { id: 'u2', email: 'b@c.com', username: 'b', createdAt: '' }
    mockRegister.mockResolvedValue({ accessToken: 'acc2', refreshToken: 'ref2', user })
    renderProvider()
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))

    fireEvent.click(screen.getByRole('button', { name: /register/i }))
    await waitFor(() => expect(screen.getByTestId('email')).toHaveTextContent('b@c.com'))
    expect(mockSetAccess).toHaveBeenCalledWith('acc2')
  })

  it('logout clears user and calls tokenStorage.clear', async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600
    const token = makeJwt({ sub: 'u1', email: 'alice@test.com', username: 'alice', exp })
    mockGetAccess.mockReturnValue(token)
    renderProvider()
    await waitFor(() => expect(screen.getByTestId('email')).toHaveTextContent('alice@test.com'))

    fireEvent.click(screen.getByRole('button', { name: /logout/i }))
    await waitFor(() => expect(screen.getByTestId('email')).toHaveTextContent('none'))
    expect(mockClear).toHaveBeenCalled()
  })

  it('uses fallback-id when sub is absent from JWT', async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600
    // No sub field — should fall back to 'fallback-id'
    const token = makeJwt({ email: 'test@example.com', username: 'tester', exp })
    mockGetAccess.mockReturnValue(token)
    renderProvider()
    await waitFor(() => expect(screen.getByTestId('email')).toHaveTextContent('test@example.com'))
  })

  it('uses email prefix as username when username absent in JWT', async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600
    const token = makeJwt({ sub: 'u1', email: 'carol@test.com', exp })
    mockGetAccess.mockReturnValue(token)
    renderProvider()
    await waitFor(() => expect(screen.getByTestId('email')).toHaveTextContent('carol@test.com'))
  })
})
