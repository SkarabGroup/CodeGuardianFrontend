import { createContext, useCallback, useEffect, useState } from 'react'
import { authApi } from '@/api/auth'
import { usersApi } from '@/api/users'
import { tokenStorage } from '@/api/gateway'
import type { User, LoginCredentials, RegisterCredentials } from '@/types'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  register: (credentials: RegisterCredentials) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const profile = await usersApi.getProfile()
      setUser(profile)
    } catch (err: unknown) {
      // 404 = endpoint not yet implemented: keep token, just don't restore user
      // 401 = token invalid: clear session
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status !== 404) {
        setUser(null)
        tokenStorage.clear()
      }
    }
  }, [])

  // On mount: try to restore session
  useEffect(() => {
    const token = tokenStorage.getAccess()
    if (!token) {
      setIsLoading(false)
      return
    }
    refreshUser().finally(() => setIsLoading(false))
  }, [refreshUser])

  const login = useCallback(async (credentials: LoginCredentials) => {
    const { accessToken, refreshToken, user: me } = await authApi.login(credentials)
    tokenStorage.setAccess(accessToken)
    tokenStorage.setRefresh(refreshToken)
    setUser(me)
  }, [])

  const register = useCallback(async (credentials: RegisterCredentials) => {
    const { accessToken, refreshToken, user: me } = await authApi.register(credentials)
    tokenStorage.setAccess(accessToken)
    tokenStorage.setRefresh(refreshToken)
    setUser(me)
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout()
    tokenStorage.clear()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
