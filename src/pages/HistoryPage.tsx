import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { History, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { analysisApi } from '@/api/analysis'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AnalysisStatusBadge } from '@/components/analysis/AnalysisStatusBadge'
import { formatDate, formatDuration, getScoreVar } from '@/lib/utils'
import type { Analysis } from '@/types'

const PAGE_SIZE = 20

export function HistoryPage() {
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const navigate = useNavigate()

  useEffect(() => {
    setIsLoading(true)
    analysisApi.getHistory({ page, limit: PAGE_SIZE })
      .then(d => { setAnalyses(d.items); setTotalPages(d.totalPages) })
      .catch(() => toast.error('Errore caricamento storico'))
      .finally(() => setIsLoading(false))
  }, [page])

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: 'var(--font-body)' }}>
      {/* Header */}
      <div className="border-b border-[var(--border)] px-6 py-4 flex items-center gap-3">
        <History className="h-4 w-4 text-[var(--fg-3)]" strokeWidth={1.5} />
        <div>
          <h1 className="font-display font-700 text-xl tracking-tight text-[var(--fg)]">Storico Analisi</h1>
          <p className="data-label mt-0.5">TUTTE LE ANALISI · ORDINATE PER DATA</p>
        </div>
      </div>

      {/* Column headers */}
      {!isLoading && analyses.length > 0 && (
        <div
          className="grid border-b border-[var(--border)] px-6 py-2"
          style={{ gridTemplateColumns: '1fr 100px 80px 80px 120px' }}
        >
          <span className="data-label">DATA</span>
          <span className="data-label text-right">QUALITÀ</span>
          <span className="data-label text-right">SICUREZZA</span>
          <span className="data-label text-right">DURATA</span>
          <span className="data-label text-right">STATO</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-6 space-y-2">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : analyses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="border border-[var(--border)] p-5 mb-6 inline-flex" style={{ borderRadius: 'var(--radius)' }}>
              <History className="h-8 w-8 text-[var(--fg-3)]" strokeWidth={1.25} />
            </div>
            <p className="font-display font-700 text-lg text-[var(--fg)] mb-2">Nessuna analisi</p>
            <p className="text-sm text-[var(--fg-3)] font-light max-w-xs">
              Le analisi completate appariranno qui.
            </p>
          </div>
        ) : (
          analyses.map((a, i) => (
            <div
              key={a.id}
              className="grid items-center border-b border-[var(--border)] px-6 py-3 cursor-pointer
                         hover:bg-[var(--surface)] transition-colors duration-100 animate-fade-in"
              style={{
                gridTemplateColumns: '1fr 100px 80px 80px 120px',
                animationDelay: `${i * 25}ms`,
              }}
              onClick={() => a.repositoryId && navigate(`/repositories/${a.repositoryId}`)}
            >
              <div>
                <p className="font-mono text-xs text-[var(--fg)]">{formatDate(a.date)}</p>
                <p className="data-label mt-0.5">{a.repositoryId ?? '—'}</p>
              </div>

              <div className="text-right">
                {a.report?.qualityScore != null ? (
                  <span className="font-mono text-sm font-300" style={{ color: getScoreVar(a.report.qualityScore), fontFeatureSettings: '"tnum"' }}>
                    {a.report.qualityScore}
                  </span>
                ) : <span className="data-label">—</span>}
              </div>

              <div className="text-right">
                {a.report?.securityScore != null ? (
                  <span className="font-mono text-sm font-300" style={{ color: getScoreVar(a.report.securityScore), fontFeatureSettings: '"tnum"' }}>
                    {a.report.securityScore}
                  </span>
                ) : <span className="data-label">—</span>}
              </div>

              <div className="text-right">
                {a.executionMetrics
                  ? <span className="font-mono text-xs text-[var(--fg-2)]">{formatDuration(a.executionMetrics.total_time_seconds)}</span>
                  : <span className="data-label">—</span>
                }
              </div>

              <div className="flex justify-end">
                <AnalysisStatusBadge status={a.status} />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="border-t border-[var(--border)] px-6 py-3 flex items-center justify-between">
          <span className="data-label">PAG. {page} / {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="icon-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="icon-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
