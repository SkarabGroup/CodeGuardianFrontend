import { gateway } from './gateway'
import type { User } from '@/types'

export const usersApi = {
  getProfile: async (): Promise<User> => {
    const { data } = await gateway.get('/account/users/profile', { timeout: 5000 })
    return data
  },

  changePassword: async (newPassword: string): Promise<void> => {
    await gateway.patch('/account/auth/update', { newPassword })
  },

  deleteAccount: async (): Promise<void> => {
    // Backend: DELETE /users/me — legge userId dal JWT
    await gateway.delete('/account/users/me')
  }
}

