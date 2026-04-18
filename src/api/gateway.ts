import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios'

const ACCOUNT_URL = import.meta.env.VITE_ACCOUNT_URL || ''
const ANALYSIS_URL = import.meta.env.VITE_ANALYSIS_URL || ''

const ACCESS_TOKEN_KEY = 'cg_access_token'
const REFRESH_TOKEN_KEY = 'cg_refresh_token'

export const tokenStorage = {
  getAccess: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  setAccess: (t: string) => localStorage.setItem(ACCESS_TOKEN_KEY, t),
  setRefresh: (t: string) => localStorage.setItem(REFRESH_TOKEN_KEY, t),
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  },
}

// Queue of requests awaiting token refresh
let isRefreshing = false
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = []

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token!)
  })
  failedQueue = []
}

export const gateway: AxiosInstance = axios.create({
  headers: { 'Content-Type': 'application/json' },
})

// Request: imposta dinamicamente l'URL o e il Bearer
gateway.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (config.url?.startsWith('/account')) {
    config.baseURL = ACCOUNT_URL
  } else {
    config.baseURL = ANALYSIS_URL
  }

  const token = tokenStorage.getAccess()
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response normalizer ──────────────────────────────────────
// Trasforma la risposta del backend prima che raggiunga i componenti:
//   • status: backend usa "PENDING"/"IN_PROGRESS" → frontend usa "pending"/"in-progress"
//   • testCoverage: backend usa range [0,1] → frontend usa [0,100]
const STATUS_MAP: Record<string, string> = {
  PENDING:     'pending',
  IN_PROGRESS: 'in-progress',
  COMPLETED:   'completed',
  FAILED:      'failed',
  NOT_ANALYZED: 'not-analyzed',
}

function normalizeAnalysis(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(normalizeAnalysis)
  if (obj !== null && typeof obj === 'object') {
    const record = obj as Record<string, unknown>
    const result: Record<string, unknown> = {}
    for (const key of Object.keys(record)) {
      if (key === 'status' && typeof record[key] === 'string') {
        result[key] = STATUS_MAP[record[key] as string] ?? (record[key] as string).toLowerCase()
      } else if (key === 'testCoverage' && typeof record[key] === 'number' && (record[key] as number) <= 1) {
        result[key] = Math.round((record[key] as number) * 100)
      } else {
        result[key] = normalizeAnalysis(record[key])
      }
    }
    return result
  }
  return obj
}

// Response: auto-refresh on 401
gateway.interceptors.response.use(
  (response: AxiosResponse) => {
    if (response.config.responseType !== 'blob') {
      response.data = normalizeAnalysis(response.data)
    }
    return response
  },
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && originalRequest.url?.includes('/auth/login')) {
      return Promise.reject(error)
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return gateway(originalRequest)
        })
      }

      isRefreshing = true
      const refreshToken = tokenStorage.getRefresh()

      if (!refreshToken) {
        isRefreshing = false
        tokenStorage.clear()
        window.location.href = '/login'
        return Promise.reject(error)
      }

      try {
        const { data } = await axios.post(`${ACCOUNT_URL}/account/auth/refresh`, { refreshToken })
        const newToken: string = data.accessToken
        tokenStorage.setAccess(newToken)
        if (data.refreshToken) tokenStorage.setRefresh(data.refreshToken)
        processQueue(null, newToken)
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return gateway(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        tokenStorage.clear()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)
