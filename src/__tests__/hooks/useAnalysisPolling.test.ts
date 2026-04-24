import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAnalysisPolling } from '@/hooks/useAnalysisPolling'

const mockGet = vi.hoisted(() => vi.fn())

vi.mock('@/api/gateway', () => ({
  gateway: { get: mockGet },
  tokenStorage: { getAccess: vi.fn(), getRefresh: vi.fn(), setAccess: vi.fn(), setRefresh: vi.fn(), clear: vi.fn() },
}))

describe('useAnalysisPolling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  it('calls gateway.get every 10 seconds', async () => {
    mockGet.mockResolvedValue({ data: { success: true, analyses: [] } })
    renderHook(() => useAnalysisPolling())

    await vi.advanceTimersByTimeAsync(10000)
    expect(mockGet).toHaveBeenCalledWith('/repositories/all-analyses')
    expect(mockGet).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(10000)
    expect(mockGet).toHaveBeenCalledTimes(2)
  })

  it('clears interval on unmount — no further calls after cleanup', async () => {
    mockGet.mockResolvedValue({ data: { success: true, analyses: [] } })
    const { unmount } = renderHook(() => useAnalysisPolling())
    unmount()

    await vi.advanceTimersByTimeAsync(10000)
    expect(mockGet).not.toHaveBeenCalled()
  })

  it('does not throw when poll fails silently', async () => {
    mockGet.mockRejectedValue(new Error('network error'))
    renderHook(() => useAnalysisPolling())

    await expect(vi.advanceTimersByTimeAsync(10000)).resolves.not.toThrow()
    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  it('accepts all option callbacks without error', async () => {
    mockGet.mockResolvedValue({ data: { success: true, analyses: [] } })
    const onStarted  = vi.fn()
    const onProgress = vi.fn()
    const onCompleted = vi.fn()
    const onFailed   = vi.fn()

    renderHook(() => useAnalysisPolling({ repositoryId: 'repo-1', onStarted, onProgress, onCompleted, onFailed }))
    await vi.advanceTimersByTimeAsync(10000)
    expect(mockGet).toHaveBeenCalledTimes(1)
  })
})
