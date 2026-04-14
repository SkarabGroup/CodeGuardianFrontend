import { gateway } from './gateway'

export const usersApi = {
  changePassword: async (newPassword: string): Promise<void> => {
    await gateway.patch('/account/auth/update', { newPassword })
  },

  deleteAccount: async (): Promise<void> => {
    // Backend: DELETE /users/me — legge userId dal JWT
    await gateway.delete('/account/users/me')
  }
}

