import { gateway } from './gateway'
import type { User } from '@/types'

export const usersApi = {
  getProfile: async (): Promise<User> => {
    const { data } = await gateway.get('/account/users/profile', { timeout: 5000 })
    return data
  },

  updateProfile: async (payload: Partial<Pick<User, 'username' | 'email'>>): Promise<User> => {
    const { data } = await gateway.put('/account/users/profile', payload)
    return data
  },

  changePassword: async (newPassword: string): Promise<void> => {
    await gateway.patch('/account/auth/update', { newPassword })
  },

  deleteAccount: async (): Promise<void> => {
    // Backend: DELETE /users/me — legge userId dal JWT
    await gateway.delete('/account/users/me')
  },

  generateApiKey: async (): Promise<{ apiKey: string }> => {
    const { data } = await gateway.post('/account/users/api-key/generate')
    return data
  },

  linkGithub: async (code: string): Promise<User> => {
    const { data } = await gateway.post('/account/users/github/link', { code })
    return data
  },

  unlinkGithub: async (): Promise<void> => {
    await gateway.delete('/account/users/github/unlink')
  },
}
