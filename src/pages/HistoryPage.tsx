import { useEffect, useState, useMemo } from 'react'
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
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [dateError, setDateError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    setIsLoading(true)
    analysisApi.getHistory({ page, limit: PAGE_SIZE })
      .then(d => { setAnalyses(d.items); setTotalPages(d.totalPages) })
      .catch(() => toast.error('Errore caricamento storico'))
      .finally(() => setIsLoading(false))
  }, [page])

  const filteredAnalyses = useMemo(() => {
    let error: string | null = null
    if (startDate && endDate) {
      if (startDate > endDate) {
        error = 'La data di inizio deve essere precedente alla data di fine'
      } else {
        const start = new Date(startDate)
        const end = new Date(endDate)
        const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
        if (diffMonths > 12) error = 'L\'intervallo non può superare 12 mesi'
      }
    }
    setDateError(error)
    if (error || (!startDate && !endDate)) return analyses
    return analyses.filter(a => {
      const d = a.date.slice(0, 10)
      return (!startDate || d >= startDate) && (!endDate || d <= endDate)
    })
  }, [analyses, startDate, endDate])

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

      {/* Date filter */}
      <div className="border-b border-[var(--border)] px-6 py-3 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="data-label">DA</span>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="font-mono text-xs h-7 px-2 bg-[var(--surface)] border border-[var(--border)] text-[var(--fg)] rounded-[var(--radius-sm)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="data-label">A</span>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="font-mono text-xs h-7 px-2 bg-[var(--surface)] border border-[var(--border)] text-[var(--fg)] rounded-[var(--radius-sm)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
        {(startDate || endDate) && (
          <button
            onClick={() => { setStartDate(''); setEndDate('') }}
            className="data-label text-[var(--fg-3)] hover:text-[var(--fg-2)] transition-colors"
          >
            AZZERA
          </button>
        )}
        {dateError && <p className="font-mono text-[11px] text-[var(--danger)]">{dateError}</p>}
      </div>

      {/* Column headers */}
      {!isLoading && filteredAnalyses.length > 0 && (
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
        ) : filteredAnalyses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="border border-[var(--border)] p-5 mb-6 inline-flex" style={{ borderRadius: 'var(--radius)' }}>
              <History className="h-8 w-8 text-[var(--fg-3)]" strokeWidth={1.25} />
            </div>
            <p className="font-display font-700 text-lg text-[var(--fg)] mb-2">Nessuna analisi</p>
            <p className="text-sm text-[var(--fg-3)] font-light max-w-xs">
              {startDate || endDate ? 'Nessuna analisi nel periodo selezionato.' : 'Le analisi completate appariranno qui.'}
            </p>
          </div>
        ) : (
          filteredAnalyses.map((a, i) => (
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
