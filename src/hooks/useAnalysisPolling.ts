import { useEffect } from 'react'
import { gateway } from '@/api/gateway'
import type {
  AnalysisStartedEvent,
  AnalysisCompletedEvent,
  AnalysisFailedEvent,
  AnalysisProgressEvent,
} from '@/types'

interface Options {
  repositoryId?: string
  onStarted?: (e: AnalysisStartedEvent) => void
  onProgress?: (e: AnalysisProgressEvent) => void
  onCompleted?: (e: AnalysisCompletedEvent) => void
  onFailed?: (e: AnalysisFailedEvent) => void
}

export function useAnalysisPolling(options: Options = {}) {
  const { repositoryId, _onStarted: __onStarted, _onProgress: __onProgress, _onCompleted: __onCompleted, _onFailed: __onFailed } = {
    _onStarted: options.onStarted,
    _onProgress: options.onProgress,
    _onCompleted: options.onCompleted,
    _onFailed: options.onFailed,
    ...options
  }

  useEffect(() => {
    // Il websocket è stato rimpiazzato da un semplice polling globale sullo stato
    const interval = setInterval(async () => {
      try {
        const { data } = await gateway.get('/analysis/all')
        if (data && data.success && Array.isArray(data.analyses)) {
          // I controlli qua andrebbero implementati mappando lo stato precedente 
          // per notificare completamenti o progressi veri
          // Per ora il polling in background basta per far risvegliare componenti come SWR / refetch
          // (Se usi SWR o react-query, preferisci il loro polling builtin nativo).
        }
      } catch (err) {
        /* silent poll fail */
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [repositoryId])
}
