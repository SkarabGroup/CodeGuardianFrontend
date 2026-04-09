import { gateway, tokenStorage } from './gateway'
import type { User, AuthTokens, LoginCredentials, RegisterCredentials } from '@/types'

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthTokens & { user: User }> => {
    const { data } = await gateway.post('/account/auth/login', credentials)
    return data
  },

  register: async ({ email, password }: RegisterCredentials): Promise<AuthTokens & { user: User }> => {
    const { data } = await gateway.post('/account/auth/register', { email, password })
    return data
  },

  refresh: async (refreshToken: string): Promise<AuthTokens> => {
    const { data } = await gateway.post('/account/auth/refresh', { refreshToken })
    return data
  },

  logout: async (): Promise<void> => {
    await gateway.post('/account/auth/logout', { refreshToken: tokenStorage.getRefresh() }).catch(() => {
      // best-effort: always clear local storage
    })
  },
}
