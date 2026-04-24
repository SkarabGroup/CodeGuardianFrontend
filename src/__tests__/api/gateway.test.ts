import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import { gateway, tokenStorage } from '@/api/gateway'

// ── tokenStorage ──────────────────────────────────────────────

describe('tokenStorage', () => {
  beforeEach(() => localStorage.clear())

  it('setAccess / getAccess round-trips', () => {
    tokenStorage.setAccess('tok-123')
    expect(tokenStorage.getAccess()).toBe('tok-123')
  })

  it('setRefresh / getRefresh round-trips', () => {
    tokenStorage.setRefresh('ref-abc')
    expect(tokenStorage.getRefresh()).toBe('ref-abc')
  })

  it('getAccess returns null when not set', () => {
    expect(tokenStorage.getAccess()).toBeNull()
  })

  it('getRefresh returns null when not set', () => {
    expect(tokenStorage.getRefresh()).toBeNull()
  })

  it('clear removes both tokens', () => {
    tokenStorage.setAccess('a')
    tokenStorage.setRefresh('r')
    tokenStorage.clear()
    expect(tokenStorage.getAccess()).toBeNull()
    expect(tokenStorage.getRefresh()).toBeNull()
  })
})

// ── normalizeAnalysis (via response interceptor) ──────────────

describe('gateway response interceptor — normalizeAnalysis', () => {
  let mock: MockAdapter

  beforeEach(() => {
    localStorage.clear()
    mock = new MockAdapter(gateway)
  })
  afterEach(() => mock.restore())

  it('maps PENDING status to "pending"', async () => {
    mock.onGet('/test').reply(200, { status: 'PENDING' })
    const { data } = await gateway.get('/test')
    expect(data.status).toBe('pending')
  })

  it('maps IN_PROGRESS status to "in-progress"', async () => {
    mock.onGet('/test').reply(200, { status: 'IN_PROGRESS' })
    const { data } = await gateway.get('/test')
    expect(data.status).toBe('in-progress')
  })

  it('maps COMPLETED status to "completed"', async () => {
    mock.onGet('/test').reply(200, { status: 'COMPLETED' })
    const { data } = await gateway.get('/test')
    expect(data.status).toBe('completed')
  })

  it('maps FAILED status to "failed"', async () => {
    mock.onGet('/test').reply(200, { status: 'FAILED' })
    const { data } = await gateway.get('/test')
    expect(data.status).toBe('failed')
  })

  it('lowercases unknown status values', async () => {
    mock.onGet('/test').reply(200, { status: 'UNKNOWN_STATUS' })
    const { data } = await gateway.get('/test')
    expect(data.status).toBe('unknown_status')
  })

  it('converts testCoverage from [0,1] to [0,100]', async () => {
    mock.onGet('/test').reply(200, { testCoverage: 0.75 })
    const { data } = await gateway.get('/test')
    expect(data.testCoverage).toBe(75)
  })

  it('leaves testCoverage > 1 unchanged', async () => {
    mock.onGet('/test').reply(200, { testCoverage: 85 })
    const { data } = await gateway.get('/test')
    expect(data.testCoverage).toBe(85)
  })

  it('normalizes nested objects recursively', async () => {
    mock.onGet('/test').reply(200, { nested: { status: 'COMPLETED' } })
    const { data } = await gateway.get('/test')
    expect(data.nested.status).toBe('completed')
  })

  it('normalizes arrays recursively', async () => {
    mock.onGet('/test').reply(200, [{ status: 'FAILED' }, { status: 'PENDING' }])
    const { data } = await gateway.get('/test')
    expect(data[0].status).toBe('failed')
    expect(data[1].status).toBe('pending')
  })

  it('passes through primitive values unchanged', async () => {
    mock.onGet('/test').reply(200, { count: 42, label: 'hello', flag: true })
    const { data } = await gateway.get('/test')
    expect(data.count).toBe(42)
    expect(data.label).toBe('hello')
    expect(data.flag).toBe(true)
  })

  it('skips normalization for blob responses', async () => {
    mock.onGet('/file').reply(200, new Blob(['data']), { 'content-type': 'application/octet-stream' })
    const { data } = await gateway.get('/file', { responseType: 'blob' })
    expect(data).toBeInstanceOf(Blob)
  })
})

// ── request interceptor ───────────────────────────────────────

describe('gateway request interceptor', () => {
  let mock: MockAdapter

  beforeEach(() => {
    localStorage.clear()
    mock = new MockAdapter(gateway)
  })
  afterEach(() => mock.restore())

  it('sets Authorization header when access token is present', async () => {
    tokenStorage.setAccess('my-token')
    let capturedAuth: string | undefined
    mock.onGet('/account/test').reply((config) => {
      capturedAuth = config.headers?.Authorization as string
      return [200, {}]
    })
    await gateway.get('/account/test')
    expect(capturedAuth).toBe('Bearer my-token')
  })

  it('does not set Authorization header when no token', async () => {
    let capturedAuth: string | undefined
    mock.onGet('/account/test').reply((config) => {
      capturedAuth = config.headers?.Authorization as string
      return [200, {}]
    })
    await gateway.get('/account/test')
    expect(capturedAuth).toBeUndefined()
  })
})

// ── response interceptor — 401 handling ──────────────────────

describe('gateway response interceptor — 401 handling', () => {
  let mock: MockAdapter

  beforeEach(() => {
    localStorage.clear()
    mock = new MockAdapter(gateway)
    // Reset module-level isRefreshing state between tests by restoring + re-creating mock
  })
  afterEach(() => mock.restore())

  it('rejects immediately on 401 from login endpoint', async () => {
    mock.onPost('/account/auth/login').reply(401, { message: 'Unauthorized' })
    await expect(gateway.post('/account/auth/login', {})).rejects.toMatchObject({
      response: { status: 401 },
    })
  })

  it('clears storage and rejects when no refresh token on 401', async () => {
    tokenStorage.setAccess('expired')
    // no refresh token set — replyOnce so the 401 is not overridden
    mock.onGet('/account/data').replyOnce(401)
    await expect(gateway.get('/account/data')).rejects.toBeDefined()
    expect(tokenStorage.getAccess()).toBeNull()
  })

  it('rejects non-401 errors immediately without token refresh', async () => {
    mock.onGet('/analysis/data').reply(503, { message: 'Service Unavailable' })
    await expect(gateway.get('/analysis/data')).rejects.toMatchObject({ response: { status: 503 } })
  })

  it('refreshes access token on 401 and retries original request', async () => {
    tokenStorage.setAccess('expired-access')
    tokenStorage.setRefresh('valid-refresh')

    let callCount = 0
    mock.onGet('/account/protected').reply(() => {
      callCount++
      return callCount === 1 ? [401, {}] : [200, { result: 'ok' }]
    })

    const axiosPostSpy = vi.spyOn(axios, 'post').mockResolvedValueOnce({
      data: { accessToken: 'new-access' },  // no refreshToken in response — covers the if(data.refreshToken) false branch
    })

    const { data } = await gateway.get('/account/protected')
    expect(data.result).toBe('ok')
    expect(tokenStorage.getAccess()).toBe('new-access')

    axiosPostSpy.mockRestore()
  })

  it('clears storage and rejects when refresh call fails on 401', async () => {
    tokenStorage.setAccess('expired-access')
    tokenStorage.setRefresh('bad-refresh')

    mock.onGet('/account/protected').replyOnce(401)

    const axiosPostSpy = vi.spyOn(axios, 'post').mockRejectedValueOnce(new Error('Refresh failed'))

    await expect(gateway.get('/account/protected')).rejects.toBeDefined()
    expect(tokenStorage.getAccess()).toBeNull()

    axiosPostSpy.mockRestore()
  })

  it('queues a second 401 request while refresh is in progress and resolves both after token renewal', async () => {
    tokenStorage.setAccess('expired-access')
    tokenStorage.setRefresh('valid-refresh')

    // First two calls return 401; subsequent calls return 200 (for retries after refresh)
    mock.onGet('/account/resource').replyOnce(401)
    mock.onGet('/account/resource').replyOnce(401)
    mock.onGet('/account/resource').reply(200, { result: 'renewed' })

    // Hold the refresh promise open so the second request can enter the queue
    let resolveRefresh!: (v: any) => void
    const refreshPromise = new Promise<any>(res => { resolveRefresh = res })
    const axiosPostSpy = vi.spyOn(axios, 'post').mockReturnValueOnce(refreshPromise)

    // Start both requests before awaiting — both receive 401 in the microtask queue
    const req1 = gateway.get('/account/resource')
    const req2 = gateway.get('/account/resource')

    // Drain microtasks: req1 sets isRefreshing=true and suspends awaiting refresh;
    // req2 sees isRefreshing=true and pushes to failedQueue
    await new Promise(resolve => setTimeout(resolve, 0))

    // Now resolve the refresh — processQueue fires and resolves the queued req2 entry
    resolveRefresh({ data: { accessToken: 'new-access', refreshToken: 'new-refresh' } })

    const [r1, r2] = await Promise.all([req1, req2])
    expect(r1.data.result).toBe('renewed')
    expect(r2.data.result).toBe('renewed')
    expect(tokenStorage.getAccess()).toBe('new-access')

    axiosPostSpy.mockRestore()
  })
})
