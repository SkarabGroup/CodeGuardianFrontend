import { gateway } from './gateway'
import type { User, AuthTokens, LoginCredentials, RegisterCredentials } from '@/types'

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthTokens & { user: User }> => {
    const { data } = await gateway.post('/account/auth/login', credentials)
    return data
  },

  register: async (credentials: RegisterCredentials): Promise<AuthTokens & { user: User }> => {
    const { data } = await gateway.post('/account/auth/register', credentials)
    return data
  },

  refresh: async (refreshToken: string): Promise<AuthTokens> => {
    const { data } = await gateway.post('/account/auth/refresh', { refreshToken })
    return data
  },

  logout: async (): Promise<void> => {
    await gateway.post('/account/auth/logout').catch(() => {
      // best-effort: always clear local storage
    })
  },
}
