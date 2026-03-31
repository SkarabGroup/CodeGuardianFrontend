import { useContext, useEffect } from 'react'
import { toast } from 'sonner'
import { SocketContext } from '@/contexts/SocketContext'
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

export function useAnalysisSocket(options: Options = {}) {
  const { socket } = useContext(SocketContext)
  const { repositoryId, onStarted, onProgress, onCompleted, onFailed } = options

  useEffect(() => {
    if (!socket) return

    const handleStarted = (e: AnalysisStartedEvent) => {
      if (repositoryId && e.repositoryId !== repositoryId) return
      onStarted?.(e)
    }

    const handleProgress = (e: AnalysisProgressEvent) => {
      if (repositoryId && e.repositoryId !== repositoryId) return
      onProgress?.(e)
    }

    const handleCompleted = (e: AnalysisCompletedEvent) => {
      if (repositoryId && e.repositoryId !== repositoryId) return
      toast.success('Analisi completata', { description: 'Il report è ora disponibile.' })
      onCompleted?.(e)
    }

    const handleFailed = (e: AnalysisFailedEvent) => {
      if (repositoryId && e.repositoryId !== repositoryId) return
      toast.error('Analisi fallita', { description: e.error ?? 'Errore sconosciuto.' })
      onFailed?.(e)
    }

    socket.on('analysis:started', handleStarted)
    socket.on('analysis:progress', handleProgress)
    socket.on('analysis:completed', handleCompleted)
    socket.on('analysis:failed', handleFailed)

    return () => {
      socket.off('analysis:started', handleStarted)
      socket.off('analysis:progress', handleProgress)
      socket.off('analysis:completed', handleCompleted)
      socket.off('analysis:failed', handleFailed)
    }
  }, [socket, repositoryId, onStarted, onProgress, onCompleted, onFailed])
}
