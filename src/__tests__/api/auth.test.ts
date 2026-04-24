import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authApi } from '@/api/auth'

const mockPost = vi.hoisted(() => vi.fn())
const mockGetRefresh = vi.hoisted(() => vi.fn())

vi.mock('@/api/gateway', () => ({
  gateway: { post: mockPost },
  tokenStorage: {
    getAccess: vi.fn(),
    getRefresh: mockGetRefresh,
    setAccess: vi.fn(),
    setRefresh: vi.fn(),
    clear: vi.fn(),
  },
}))

const fakeTokens = { accessToken: 'acc', refreshToken: 'ref', user: { id: '1', email: 'a@b.com', username: 'a', createdAt: '' } }

describe('authApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('login posts credentials and returns tokens + user', async () => {
    mockPost.mockResolvedValue({ data: fakeTokens })
    const result = await authApi.login({ email: 'a@b.com', password: 'pw' })
    expect(mockPost).toHaveBeenCalledWith('/account/auth/login', { email: 'a@b.com', password: 'pw' })
    expect(result).toEqual(fakeTokens)
  })

  it('register posts email+password and returns tokens + user', async () => {
    mockPost.mockResolvedValue({ data: fakeTokens })
    const result = await authApi.register({ email: 'a@b.com', password: 'pw', username: 'a', confirmPassword: 'pw' })
    expect(mockPost).toHaveBeenCalledWith('/account/auth/register', { email: 'a@b.com', password: 'pw' })
    expect(result).toEqual(fakeTokens)
  })

  it('refresh posts refreshToken and returns new tokens', async () => {
    const newTokens = { accessToken: 'new-acc', refreshToken: 'new-ref' }
    mockPost.mockResolvedValue({ data: newTokens })
    const result = await authApi.refresh('old-ref')
    expect(mockPost).toHaveBeenCalledWith('/account/auth/refresh', { refreshToken: 'old-ref' })
    expect(result).toEqual(newTokens)
  })

  it('logout posts refresh token (best-effort) and resolves', async () => {
    mockGetRefresh.mockReturnValue('ref-tok')
    mockPost.mockResolvedValue({})
    await expect(authApi.logout()).resolves.toBeUndefined()
    expect(mockPost).toHaveBeenCalledWith('/account/auth/logout', { refreshToken: 'ref-tok' })
  })

  it('logout resolves even when the post fails', async () => {
    mockGetRefresh.mockReturnValue('ref-tok')
    mockPost.mockRejectedValue(new Error('network'))
    await expect(authApi.logout()).resolves.toBeUndefined()
  })
})
