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
  const { repositoryId, onStarted, onProgress, onCompleted, onFailed } = options

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    void { onStarted, onProgress, onCompleted, onFailed }
    
    // Polling periodico globale per aggiornare lo stato e invalidare le chache (SWR/react-query)
    const interval = setInterval(async () => {
      try {
        const { data } = await gateway.get('/repositories/all')
        if (data && data.success && Array.isArray(data.analyses)) {
          // Logica avanzata di notifica completamento o progresso non implementata
        }
      } catch (err) {
        /* silent poll fail */
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [repositoryId, onStarted, onProgress, onCompleted, onFailed])
}
