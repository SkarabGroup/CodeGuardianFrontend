import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import { toast } from 'sonner'
import { repositoriesApi } from '@/api/repositories'
import { Skeleton } from '@/components/ui/skeleton'
import { getScoreVar, formatDateShort } from '@/lib/utils'
import type { RankedRepository } from '@/types'

export function RankingPage() {
  const [ranking, setRanking] = useState<RankedRepository[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    repositoriesApi.getRanking()
      .then(setRanking)
      .catch(() => toast.error('Errore caricamento classifica'))
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: 'var(--font-body)' }}>
      {/* Header */}
      <div className="border-b border-[var(--border)] px-6 py-4 flex items-center gap-3">
        <Trophy className="h-4 w-4 text-[var(--warning)]" strokeWidth={1.5} />
        <div>
          <h1 className="font-display font-700 text-xl tracking-tight text-[var(--fg)]">Classifica</h1>
          <p className="data-label mt-0.5">REPOSITORY ORDINATE PER SCORE QUALITÀ</p>
        </div>
      </div>

      {/* Column headers */}
      {!isLoading && ranking.length > 0 && (
        <div
          className="grid border-b border-[var(--border)] px-6 py-2"
          style={{ gridTemplateColumns: '48px 1fr 160px 100px' }}
        >
          <span className="data-label">#</span>
          <span className="data-label">REPOSITORY</span>
          <span className="data-label">ULTIMA ANALISI</span>
          <span className="data-label text-right">SCORE</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-6 space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : ranking.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="border border-[var(--border)] p-5 mb-6 inline-flex" style={{ borderRadius: 'var(--radius)' }}>
              <Trophy className="h-8 w-8 text-[var(--fg-3)]" strokeWidth={1.25} />
            </div>
            <p className="font-display font-700 text-lg text-[var(--fg)] mb-2">Classifica vuota</p>
            <p className="text-sm text-[var(--fg-3)] font-light max-w-xs">
              Analizza i tuoi repository per vederli in classifica.
            </p>
          </div>
        ) : (
          ranking.map(({ rank, repository, score, lastAnalyzed }, i) => {
            const isTop3 = rank <= 3
            return (
              <div
                key={repository.id}
                className="grid items-center border-b border-[var(--border)] px-6 py-4 cursor-pointer
                           hover:bg-[var(--surface)] transition-colors duration-100 animate-fade-in"
                style={{
                  gridTemplateColumns: '48px 1fr 160px 100px',
                  animationDelay: `${i * 40}ms`,
                  background: isTop3 ? `${getScoreVar(score)}05` : undefined,
                  borderLeft: isTop3 ? `2px solid ${getScoreVar(score)}40` : '2px solid transparent',
                }}
                onClick={() => navigate(`/repositories/${repository.id}`)}
              >
                {/* Rank */}
                <div className="flex items-center">
                  {rank <= 3 ? (
                    <span
                      className="font-mono text-lg font-300"
                      style={{ color: getScoreVar(score), fontFeatureSettings: '"tnum"' }}
                    >
                      {rank === 1 ? '①' : rank === 2 ? '②' : '③'}
                    </span>
                  ) : (
                    <span className="font-mono text-sm text-[var(--fg-3)]" style={{ fontFeatureSettings: '"tnum"' }}>
                      {String(rank).padStart(2, '0')}
                    </span>
                  )}
                </div>

                {/* Name */}
                <div>
                  <p className="font-display font-600 text-sm text-[var(--fg)]">{repository.name}</p>
                  {repository.description && (
                    <p className="font-mono text-[11px] text-[var(--fg-3)] truncate mt-0.5">{repository.description}</p>
                  )}
                </div>

                {/* Date */}
                <div>
                  {lastAnalyzed
                    ? <span className="font-mono text-xs text-[var(--fg-3)]">{formatDateShort(lastAnalyzed)}</span>
                    : <span className="data-label">—</span>
                  }
                </div>

                {/* Score */}
                <div className="text-right">
                  <span
                    className="font-mono text-2xl font-300"
                    style={{ color: getScoreVar(score), fontFeatureSettings: '"tnum"' }}
                  >
                    {score}
                  </span>
                  <span className="data-label ml-0.5">/100</span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
