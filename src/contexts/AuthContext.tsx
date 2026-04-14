import { createContext, useCallback, useEffect, useState } from 'react'
import { authApi } from '@/api/auth'
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
    const token = tokenStorage.getAccess()
    if (token) {
      try {
        const base64Url = token.split('.')[1]
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        const payload = JSON.parse(window.atob(base64))
        
        // Verifica la scadenza del token (exp è in secondi)
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          throw new Error('Token expired')
        }

        setUser({
          id: payload.sub || 'fallback-id',
          email: payload.email || '',
          username: payload.username || payload.email?.split('@')[0] || '',
          createdAt: new Date().toISOString()
        })
        return // successly restored locally
      } catch (err) {
        // invalid or expired token payload, drop down
      }
    }

    setUser(null)
    tokenStorage.clear()
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
