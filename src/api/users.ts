import { gateway } from './gateway'
import type { User } from '@/types'

export const usersApi = {
  getProfile: async (): Promise<User> => {
    const { data } = await gateway.get('/account/users/profile')
    return data
  },

  updateProfile: async (payload: Partial<Pick<User, 'username' | 'email'>>): Promise<User> => {
    const { data } = await gateway.put('/account/users/profile', payload)
    return data
  },

  changePassword: async (payload: { currentPassword: string; newPassword: string }): Promise<void> => {
    await gateway.put('/account/users/password', payload)
  },

  deleteAccount: async (): Promise<void> => {
    await gateway.delete('/account/users/account')
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
