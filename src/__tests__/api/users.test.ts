import { describe, it, expect, vi, beforeEach } from 'vitest'
import { usersApi } from '@/api/users'

const mockPatch = vi.hoisted(() => vi.fn())
const mockDelete = vi.hoisted(() => vi.fn())

vi.mock('@/api/gateway', () => ({
  gateway: { patch: mockPatch, delete: mockDelete },
  tokenStorage: { getAccess: vi.fn(), getRefresh: vi.fn(), setAccess: vi.fn(), setRefresh: vi.fn(), clear: vi.fn() },
}))

describe('usersApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('changePassword sends PATCH with new password', async () => {
    mockPatch.mockResolvedValue({})
    await usersApi.changePassword('NewPass1!')
    expect(mockPatch).toHaveBeenCalledWith('/account/auth/update', { newPassword: 'NewPass1!' })
  })

  it('deleteAccount sends DELETE to /account/users/me', async () => {
    mockDelete.mockResolvedValue({})
    await usersApi.deleteAccount()
    expect(mockDelete).toHaveBeenCalledWith('/account/users/me')
  })
})
