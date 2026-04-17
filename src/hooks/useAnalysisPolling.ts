import { useEffect, useRef } from 'react'
import { gateway } from '@/api/gateway'
import type {
  AnalysisStartedEvent,
  AnalysisCompletedEvent,
  AnalysisFailedEvent,
  AnalysisProgressEvent,
  AnalysisReport,
} from '@/types'

const POLL_INTERVAL = 5000

interface Options {
  repositoryId?: string
  onStarted?: (e: AnalysisStartedEvent) => void
  onProgress?: (e: AnalysisProgressEvent) => void
  onCompleted?: (e: AnalysisCompletedEvent) => void
  onFailed?: (e: AnalysisFailedEvent) => void
}

export function useAnalysisPolling({
  repositoryId,
  onStarted,
  onProgress,
  onCompleted,
  onFailed,
}: Options = {}) {
  // Keep callbacks current without restarting the interval
  const cbRef = useRef({ onStarted, onProgress, onCompleted, onFailed })
  useEffect(() => { cbRef.current = { onStarted, onProgress, onCompleted, onFailed } })

  const prevStatuses = useRef<Map<string, string>>(new Map())
  const syntheticProgress = useRef<Map<string, number>>(new Map())
  const initialized = useRef(false)

  useEffect(() => {
    const poll = async () => {
      try {
        const { data } = await gateway.get('/analysis/all')
        if (!data?.success || !Array.isArray(data.analyses)) return

        const { onStarted, onProgress, onCompleted, onFailed } = cbRef.current

        for (const item of data.analyses as Array<{ analysisId: string; status: string }>) {
          const { analysisId, status } = item
          const prev = prevStatuses.current.get(analysisId)
          const repoId = repositoryId ?? ''

          if (!initialized.current) {
            prevStatuses.current.set(analysisId, status)
            continue
          }

          if (prev === status) {
            if (status === 'in-progress' && onProgress) {
              const p = Math.min((syntheticProgress.current.get(analysisId) ?? 10) + 8, 90)
              syntheticProgress.current.set(analysisId, p)
              onProgress({ repositoryId: repoId, analysisId, progress: p })
            }
            continue
          }

          prevStatuses.current.set(analysisId, status)

          if (status === 'in-progress') {
            syntheticProgress.current.set(analysisId, 10)
            onStarted?.({ repositoryId: repoId, analysisId })
          } else if (status === 'completed') {
            syntheticProgress.current.delete(analysisId)
            onCompleted?.({ repositoryId: repoId, analysisId, report: {} as AnalysisReport })
          } else if (status === 'failed') {
            syntheticProgress.current.delete(analysisId)
            onFailed?.({ repositoryId: repoId, analysisId, error: '' })
          }
        }

        initialized.current = true
      } catch {
        // silent poll fail
      }
    }

    poll()
    const interval = setInterval(poll, POLL_INTERVAL)
    return () => {
      clearInterval(interval)
      initialized.current = false
      prevStatuses.current.clear()
      syntheticProgress.current.clear()
    }
  }, [repositoryId])
}
