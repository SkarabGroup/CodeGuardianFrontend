import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Zap, Code2, Lock, FileText, GitBranch } from 'lucide-react'
import { toast } from 'sonner'
import { repositoriesApi } from '@/api/repositories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { AnalysisArea } from '@/types'

interface AreaOption {
  id: AnalysisArea
  icon: React.ReactNode
  label: string
  description: string
}

const areas: AreaOption[] = [
  { id: 'code', icon: <Code2 className="h-5 w-5" />, label: 'Codice', description: 'Analisi statica, bug, test coverage' },
  { id: 'security', icon: <Lock className="h-5 w-5" />, label: 'Sicurezza', description: 'OWASP, dipendenze vulnerabili' },
  { id: 'documentation', icon: <FileText className="h-5 w-5" />, label: 'Documentazione', description: 'Completezza e coerenza' },
]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  repositoryId: string
  repositoryName: string
  repositoryUrl: string
  onStarted: () => void
}

// Regex per validare nomi branch Git (no .., ~, ^, :, ?, *, [, \, spazi)
const BRANCH_RE = /^(?!.*\.\.)(?!.*\/\/)(?!\/)(?!.*\/$)[^\s~^:?*\[\\]+$/

export function AnalysisOptionsModal({ open, onOpenChange, repositoryId, repositoryName, repositoryUrl, onStarted }: Props) {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<Set<AnalysisArea>>(new Set(['code', 'security', 'documentation']))
  const [branch, setBranch] = useState('main')
  const [commitHash, setCommitHash] = useState('')
  const [branchError, setBranchError] = useState('')
  const [commitError, setCommitError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const toggleArea = (area: AnalysisArea) => {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(area)) {
        if (next.size === 1) return s
        next.delete(area)
      } else {
        next.add(area)
      }
      return next
    })
  }

  const validate = () => {
    let ok = true
    if (!branch.trim() || !BRANCH_RE.test(branch.trim())) {
      setBranchError('Nome branch non valido')
      ok = false
    } else {
      setBranchError('')
    }
    if (commitHash && !/^[0-9a-f]{40}$/i.test(commitHash.trim())) {
      setCommitError('Inserire un SHA-1 valido (40 caratteri esadecimali) oppure lasciare vuoto')
      ok = false
    } else {
      setCommitError('')
    }
    return ok
  }

  const handleStart = async () => {
    if (!validate()) return
    setIsLoading(true)
    try {
      await repositoriesApi.startAnalysis(repositoryId, {
        areas: Array.from(selected),
        branch: branch.trim(),
        commitHash: commitHash.trim() || undefined,
        repositoryUrl,
      })
      toast.success('Analisi avviata', { description: `Analisi di ${repositoryName || 'repository'} in corso...` })
      onStarted()
      onOpenChange(false)
      navigate('/repositories')
    } catch {
      toast.error('Errore', { description: "Impossibile avviare l'analisi." })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-[hsl(var(--primary))]" />
            Avvia analisi
          </DialogTitle>
          <DialogDescription>
            Seleziona le aree da analizzare per <strong className="text-[hsl(var(--foreground))]">{repositoryName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {areas.map(({ id, icon, label, description }) => {
            const isSelected = selected.has(id)
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleArea(id)}
                className={cn(
                  'w-full flex items-center gap-4 rounded-lg border p-4 text-left transition-all',
                  isSelected
                    ? 'border-[hsl(var(--primary))]/50 bg-[hsl(var(--primary))]/5 text-[hsl(var(--foreground))]'
                    : 'border-[hsl(var(--border))] hover:border-[hsl(var(--muted-foreground))]/30 text-[hsl(var(--muted-foreground))]',
                )}
              >
                <div className={cn('shrink-0', isSelected ? 'text-[hsl(var(--primary))]' : '')}>{icon}</div>
                <div>
                  <p className="font-medium text-sm">{label}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{description}</p>
                </div>
                <div className={cn('ml-auto h-4 w-4 rounded border-2 transition-all', isSelected ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]' : 'border-[hsl(var(--border))]')}>
                  {isSelected && (
                    <svg viewBox="0 0 16 16" fill="white" className="h-3 w-3">
                      <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z" />
                    </svg>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Branch & commit */}
        <div className="space-y-3 border-t border-[hsl(var(--border))] pt-4">
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-xs font-mono text-[hsl(var(--muted-foreground))] uppercase tracking-widest">
              <GitBranch className="h-3.5 w-3.5" />
              Branch
            </label>
            <Input
              value={branch}
              onChange={e => setBranch(e.target.value)}
              placeholder="main"
              className="font-mono text-sm"
            />
            {branchError && <p className="font-mono text-[11px] text-[var(--danger)]">{branchError}</p>}
          </div>
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-xs font-mono text-[hsl(var(--muted-foreground))] uppercase tracking-widest">
              Commit hash
              <span className="normal-case tracking-normal font-sans text-[10px]">(opzionale)</span>
            </label>
            <Input
              value={commitHash}
              onChange={e => setCommitHash(e.target.value)}
              placeholder="Lascia vuoto per l'ultimo commit del branch"
              className="font-mono text-sm"
            />
            {commitError && <p className="font-mono text-[11px] text-[var(--danger)]">{commitError}</p>}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button className="flex-1" onClick={handleStart} disabled={isLoading || selected.size === 0}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Avvia ({selected.size})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
