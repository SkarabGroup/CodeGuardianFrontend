import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, GitBranch, Trash2, ExternalLink, Zap, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { repositoriesApi } from '@/api/repositories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { AnalysisStatusBadge } from '@/components/analysis/AnalysisStatusBadge'
import { AddRepositoryModal } from '@/components/repository/AddRepositoryModal'
import { AnalysisOptionsModal } from '@/components/analysis/AnalysisOptionsModal'
import { useAnalysisSocket } from '@/hooks/useAnalysisSocket'
import { formatDate, getScoreVar, truncate } from '@/lib/utils'
import type { Repository } from '@/types'

export function RepositoriesPage() {
  const [repos, setRepos] = useState<Repository[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [analyzeTarget, setAnalyzeTarget] = useState<Repository | null>(null)
  const navigate = useNavigate()

  const loadRepos = useCallback(async () => {
    setLoadError(false)
    try {
      const data = await repositoriesApi.list({ search: search || undefined })
      setRepos(data)
    } catch {
      toast.error('Errore nel caricamento')
      setLoadError(true)
    } finally {
      setIsLoading(false)
    }
  }, [search])

  useEffect(() => {
    setIsLoading(true)
    const t = setTimeout(loadRepos, 300)
    return () => clearTimeout(t)
  }, [loadRepos])

  useAnalysisSocket({
    onStarted: ({ repositoryId }) => {
      setRepos(prev =>
        prev.map(r => r.id === repositoryId
          ? { ...r, lastAnalysis: { id: '', date: new Date().toISOString(), status: 'in-progress' } }
          : r)
      )
    },
    onCompleted: ({ repositoryId }) => {
      setRepos(prev =>
        prev.map(r => r.id === repositoryId
          ? { ...r, lastAnalysis: { ...r.lastAnalysis!, status: 'completed' } }
          : r)
      )
      loadRepos()
    },
    onFailed: ({ repositoryId }) => {
      setRepos(prev =>
        prev.map(r => r.id === repositoryId
          ? { ...r, lastAnalysis: { ...r.lastAnalysis!, status: 'failed' } }
          : r)
      )
    },
  })

  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Eliminare "${name}"?`)) return
    try {
      await repositoriesApi.delete(id)
      setRepos(prev => prev.filter(r => r.id !== id))
      toast.success('Repository eliminata')
    } catch {
      toast.error('Errore')
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: 'var(--font-body)' }}>
      {/* ── Page header ─────────────────────────────────────── */}
      <div className="border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-display font-700 text-xl tracking-tight text-[var(--fg)]">Repository</h1>
          <p className="data-label mt-0.5">
            {isLoading ? '—' : repos.length} TOTALI
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} size="sm">
          <Plus className="h-3.5 w-3.5" />
          Aggiungi
        </Button>
      </div>

      {/* ── Search ──────────────────────────────────────────── */}
      <div className="border-b border-[var(--border)] px-6 py-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--fg-3)]" />
          <Input
            placeholder="Cerca per nome…"
            className="pl-8 h-7 text-xs"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {/* Column headers */}
        {!isLoading && repos.length > 0 && (
          <div className="grid items-center border-b border-[var(--border)] px-6 py-2"
               style={{ gridTemplateColumns: '1fr 140px 80px 80px 100px' }}>
            <span className="data-label">NOME</span>
            <span className="data-label">ULTIMA ANALISI</span>
            <span className="data-label text-right">QUALITÀ</span>
            <span className="data-label text-right">SICUREZ.</span>
            <span className="data-label text-right">AZIONI</span>
          </div>
        )}

        {isLoading ? (
          <div className="p-6 space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : repos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="border border-[var(--border)] p-5 mb-6" style={{ borderRadius: 'var(--radius)' }}>
              <GitBranch className="h-8 w-8 text-[var(--fg-3)]" strokeWidth={1.25} />
            </div>
            <p className="font-display font-700 text-lg text-[var(--fg)] mb-2">
              {search ? 'Nessun risultato' : 'Nessun repository'}
            </p>
            <p className="text-sm text-[var(--fg-3)] font-light mb-6 max-w-xs">
              {loadError
                ? 'Impossibile caricare i repository. Controlla la connessione.'
                : search
                  ? `Nessun repository corrisponde a "${search}".`
                  : 'Aggiungi il primo repository per avviare un\'analisi.'}
            </p>
            {loadError ? (
              <Button size="sm" variant="outline" onClick={() => { setIsLoading(true); loadRepos() }}>
                <RefreshCw className="h-3.5 w-3.5" />
                Riprova
              </Button>
            ) : !search && (
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                Aggiungi repository
              </Button>
            )}
          </div>
        ) : (
          repos.map((repo, i) => {
            const qs = repo.lastAnalysis?.report?.qualityScore
            const ss = repo.lastAnalysis?.report?.securityScore
            const isRunning = repo.lastAnalysis?.status === 'in-progress' || repo.lastAnalysis?.status === 'pending'

            return (
              <div
                key={repo.id}
                className="grid items-center border-b border-[var(--border)] px-6 py-3.5 cursor-pointer
                           hover:bg-[var(--surface)] transition-colors duration-100 group animate-fade-in"
                style={{
                  gridTemplateColumns: '1fr 140px 80px 80px 100px',
                  animationDelay: `${i * 30}ms`,
                }}
                onClick={() => navigate(`/repositories/${repo.id}`)}
              >
                {/* Name */}
                <div className="min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <GitBranch className="h-3.5 w-3.5 text-[var(--fg-3)] shrink-0" strokeWidth={1.5} />
                    <span className="font-display font-600 text-sm text-[var(--fg)] truncate">{repo.name}</span>
                    <AnalysisStatusBadge status={repo.lastAnalysis?.status ?? 'not-analyzed'} />
                  </div>
                  {repo.description && (
                    <p className="font-mono text-[11px] text-[var(--fg-3)] truncate pl-6">
                      {truncate(repo.description, 72)}
                    </p>
                  )}
                </div>

                {/* Last analysis */}
                <div>
                  {repo.lastAnalysis
                    ? <span className="font-mono text-[11px] text-[var(--fg-3)]">{formatDate(repo.lastAnalysis.date)}</span>
                    : <span className="data-label">—</span>
                  }
                </div>

                {/* Quality score */}
                <div className="text-right">
                  {qs != null
                    ? <span className="font-mono text-sm font-300" style={{ color: getScoreVar(qs), fontFeatureSettings: '"tnum"' }}>{qs}</span>
                    : <span className="data-label">—</span>
                  }
                </div>

                {/* Security score */}
                <div className="text-right">
                  {ss != null
                    ? <span className="font-mono text-sm font-300" style={{ color: getScoreVar(ss), fontFeatureSettings: '"tnum"' }}>{ss}</span>
                    : <span className="data-label">—</span>
                  }
                </div>

                {/* Actions */}
                <div
                  className="flex items-center justify-end gap-1"
                  onClick={e => e.stopPropagation()}
                >
                  <a
                    href={repo.url} target="_blank" rel="noopener noreferrer"
                    className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)]
                               text-[var(--fg-3)] hover:text-[var(--fg-2)] hover:bg-[var(--surface-2)] transition-colors"
                    title="GitHub"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <button
                    onClick={() => setAnalyzeTarget(repo)}
                    disabled={isRunning}
                    className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)]
                               text-[var(--fg-3)] hover:text-[var(--accent)] hover:bg-[var(--accent-dim)] transition-colors
                               disabled:opacity-30 disabled:pointer-events-none"
                    title="Analizza"
                  >
                    <Zap className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={e => handleDelete(repo.id, repo.name, e)}
                    className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)]
                               text-[var(--fg-3)] hover:text-[var(--danger)] hover:bg-[var(--danger-dim)] transition-colors"
                    title="Elimina"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modals */}
      <AddRepositoryModal
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={repo => setRepos(prev => [repo, ...prev])}
      />
      {analyzeTarget && (
        <AnalysisOptionsModal
          open={!!analyzeTarget}
          onOpenChange={open => !open && setAnalyzeTarget(null)}
          repositoryId={analyzeTarget.id}
          repositoryName={analyzeTarget.name}
          onStarted={() => {
            setRepos(prev =>
              prev.map(r => r.id === analyzeTarget.id
                ? { ...r, lastAnalysis: { id: '', date: new Date().toISOString(), status: 'pending' } }
                : r)
            )
            setAnalyzeTarget(null)
          }}
        />
      )}
    </div>
  )
}
