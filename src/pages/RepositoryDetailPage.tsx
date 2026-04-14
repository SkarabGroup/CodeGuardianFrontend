import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ExternalLink, Zap, Code2, Lock, FileText,
  AlertTriangle, ShieldAlert, Info, CheckCircle2, XCircle,
  Clock, ChevronLeft, Download, ChevronDown,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import { toast } from 'sonner'
import { repositoriesApi } from '@/api/repositories'
import { analysisApi } from '@/api/analysis'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { ScoreCard } from '@/components/shared/ScoreCard'
import { AnalysisStatusBadge } from '@/components/analysis/AnalysisStatusBadge'
import { AnalysisOptionsModal } from '@/components/analysis/AnalysisOptionsModal'
import { useAnalysisSocket } from '@/hooks/useAnalysisSocket'
import { formatDate, formatDateShort, formatDuration, getSeverityVar } from '@/lib/utils'
import type { Repository, Issue, Remediation, Analysis, ExportFormat } from '@/types'

export function RepositoryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [repo, setRepo] = useState<Repository | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [analyzeOpen, setAnalyzeOpen] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!exportOpen) return
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [exportOpen])

  const load = useCallback(async () => {
    if (!id) return
    try {
      const data = await repositoriesApi.get(id)
      setRepo(data)
    } catch {
      toast.error('Repository non trovata')
      navigate('/repositories')
    } finally {
      setIsLoading(false)
    }
  }, [id, navigate])

  useEffect(() => { load() }, [load])

  useAnalysisSocket({
    repositoryId: id,
    onStarted:   () => { setAnalysisProgress(0); load() },
    onProgress:  ({ progress }) => setAnalysisProgress(progress),
    onCompleted: () => { setAnalysisProgress(100); load() },
    onFailed:    () => load(),
  })

  const handleExport = async (format: ExportFormat) => {
    if (!analysis) return
    setExporting(true)
    setExportOpen(false)
    try {
      const blob = await analysisApi.exportReport(analysis.id, format)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report-${repo?.name ?? analysis.id}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Errore durante l\'esportazione')
    } finally {
      setExporting(false)
    }
  }

  if (isLoading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  )

  if (!repo) return null

  const analysis = repo.lastAnalysis
  const report   = analysis?.report
  const isRunning = analysis?.status === 'in-progress' || analysis?.status === 'pending'

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: 'var(--font-body)' }}>

      {/* ── Top bar ─────────────────────────────────────────── */}
      <div className="border-b border-[var(--border)] px-6 py-4 flex items-start justify-between gap-6">
        <div className="min-w-0">
          {/* Breadcrumb */}
          <button
            onClick={() => navigate('/repositories')}
            className="flex items-center gap-1.5 data-label text-[var(--fg-3)] hover:text-[var(--fg-2)] mb-2 transition-colors"
          >
            <ChevronLeft className="h-3 w-3" />
            Repository
          </button>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display font-700 text-xl tracking-tight text-[var(--fg)]">{repo.name}</h1>
            <AnalysisStatusBadge status={analysis?.status ?? 'not-analyzed'} />
          </div>

          {repo.description && (
            <p className="text-sm text-[var(--fg-3)] font-light mt-1">{repo.description}</p>
          )}

          <a
            href={repo.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-mono text-[11px] text-[var(--fg-3)] hover:text-[var(--accent)] transition-colors mt-1"
          >
            {repo.url}<ExternalLink className="h-3 w-3" />
          </a>
          {analysis?.commitHash && (
            <a
              href={`${repo.url}/commit/${analysis.commitHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-[11px] text-[var(--fg-3)] hover:text-[var(--accent)] transition-colors mt-0.5"
            >
              <span className="data-label">COMMIT</span>
              {analysis.commitHash.slice(0, 7)}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {report && (
            <div className="relative" ref={exportRef}>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setExportOpen(o => !o)}
                disabled={exporting}
              >
                <Download className="h-3.5 w-3.5" />
                Esporta
                <ChevronDown className="h-3 w-3" />
              </Button>
              {exportOpen && (
                <div
                  className="absolute right-0 top-full mt-1 z-50 min-w-[140px] border border-[var(--border)] bg-[var(--bg)] shadow-lg"
                  style={{ borderRadius: 'var(--radius-sm)' }}
                >
                  {(['pdf', 'json'] as ExportFormat[]).map(fmt => (
                    <button
                      key={fmt}
                      onClick={() => handleExport(fmt)}
                      className="w-full flex items-center gap-2 px-3 py-2 font-mono text-xs text-[var(--fg-2)] hover:bg-[var(--surface)] hover:text-[var(--fg)] transition-colors text-left"
                    >
                      <Download className="h-3 w-3 text-[var(--fg-3)]" />
                      {fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <Button
            size="sm"
            variant={isRunning ? 'secondary' : 'default'}
            onClick={() => setAnalyzeOpen(true)}
            disabled={isRunning}
          >
            {isRunning
              ? <><Clock className="h-3.5 w-3.5 animate-spin" />In corso…</>
              : <><Zap className="h-3.5 w-3.5" />Analizza</>
            }
          </Button>
        </div>
      </div>

      {/* ── Analysis progress bar ────────────────────────────── */}
      {isRunning && (
        <div className="border-b border-[var(--border)] px-6 py-3 bg-[var(--accent-dim)]">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-[var(--accent)] opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              </span>
              <span className="data-label text-[var(--accent)]">ANALISI IN CORSO</span>
            </span>
            {analysisProgress > 0 && (
              <span className="font-mono text-xs text-[var(--accent)]">{analysisProgress}%</span>
            )}
          </div>
          {analysisProgress > 0 && (
            <Progress value={analysisProgress} className="h-[2px]" indicatorClassName="bg-[var(--accent)]" />
          )}
        </div>
      )}

      {/* ── Score row ────────────────────────────────────────── */}
      {report && (
        <div className="border-b border-[var(--border)] grid grid-cols-3 divide-x divide-[var(--border)]">
          <ScoreCard label="QUALITÀ CODICE"    score={report.qualityScore}            icon={<Code2 className="h-4 w-4" strokeWidth={1.5} />} />
          <ScoreCard label="SICUREZZA"         score={report.securityScore}           icon={<Lock className="h-4 w-4" strokeWidth={1.5} />} />
          <ScoreCard label="DOCUMENTAZIONE"    score={report.documentationScore ?? 0} icon={<FileText className="h-4 w-4" strokeWidth={1.5} />} />
        </div>
      )}

      {/* ── Issue summary bar ─────────────────────────────────── */}
      {report && (
        <div className="border-b border-[var(--border)] grid grid-cols-3 divide-x divide-[var(--border)]">
          {[
            { icon: AlertTriangle, n: report.criticalIssues, label: 'CRITICAL', color: 'var(--danger)' },
            { icon: ShieldAlert,   n: report.warningIssues,  label: 'WARNINGS', color: 'var(--warning)' },
            { icon: Info,          n: report.infoIssues,     label: 'INFO',     color: 'var(--info)' },
          ].map(({ icon: Icon, n, label, color }) => (
            <div key={label} className="flex items-center gap-4 px-5 py-3">
              <Icon className="h-4 w-4 shrink-0" style={{ color }} strokeWidth={1.5} />
              <div>
                <p className="font-mono text-xl font-300 leading-none" style={{ color, fontFeatureSettings: '"tnum"' }}>{n}</p>
                <p className="data-label mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {report ? (
          <Tabs defaultValue="code" className="flex flex-col flex-1 overflow-hidden">
            <TabsList className="px-6 shrink-0">
              <TabsTrigger value="code"><Code2 className="h-3.5 w-3.5" />Codice</TabsTrigger>
              <TabsTrigger value="security"><Lock className="h-3.5 w-3.5" />Sicurezza</TabsTrigger>
              <TabsTrigger value="docs"><FileText className="h-3.5 w-3.5" />Documentazione</TabsTrigger>
              <TabsTrigger value="remediation">Remediation</TabsTrigger>
              <TabsTrigger value="history">Storico</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="code" className="px-6 mt-0">
                {(report.codeAnalysis?.testCoverage != null || report.codeAnalysis?.linesAnalyzed != null || report.codeAnalysis?.ai_interpretation) && (
                  <div className="flex flex-col gap-4 py-4 border-b border-[var(--border)] mb-2">
                    <div className="flex gap-8">
                      {report.codeAnalysis.testCoverage != null && (
                        <div>
                          <p className="data-label mb-0.5">COPERTURA TEST</p>
                          <p className="font-mono text-xl font-300" style={{ color: 'var(--accent)', fontFeatureSettings: '"tnum"' }}>
                            {report.codeAnalysis.testCoverage}<span className="text-sm text-[var(--fg-3)]">%</span>
                          </p>
                        </div>
                      )}
                      
                      {report.codeAnalysis.coverage?.overall_branch_pct != null && (
                        <div>
                          <p className="data-label mb-0.5">BRANCH COVERAGE</p>
                          <p className="font-mono text-xl font-300" style={{ color: 'var(--warning)', fontFeatureSettings: '"tnum"' }}>
                            {Math.round(report.codeAnalysis.coverage.overall_branch_pct * 100)}<span className="text-sm text-[var(--fg-3)]">%</span>
                          </p>
                        </div>
                      )}
                      
                      {report.codeAnalysis.coverage?.overall_function_pct != null && (
                        <div>
                          <p className="data-label mb-0.5">FUNCTION COVERAGE</p>
                          <p className="font-mono text-xl font-300" style={{ color: 'var(--info)', fontFeatureSettings: '"tnum"' }}>
                            {Math.round(report.codeAnalysis.coverage.overall_function_pct * 100)}<span className="text-sm text-[var(--fg-3)]">%</span>
                          </p>
                        </div>
                      )}

                      {report.codeAnalysis.linesAnalyzed != null && (
                        <div>
                          <p className="data-label mb-0.5">RIGHE ANALIZZATE</p>
                          <p className="font-mono text-xl font-300" style={{ color: 'var(--fg)', fontFeatureSettings: '"tnum"' }}>
                            {report.codeAnalysis.linesAnalyzed.toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {report.codeAnalysis.ai_interpretation && (
                      <div className="mt-4 bg-[var(--surface-hover)] rounded-md p-4 border border-[var(--border)]">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="font-mono text-xs text-[var(--accent)] border-[var(--accent)]">
                            AI VERDICT: {report.codeAnalysis.ai_interpretation.verdict}
                          </Badge>
                        </div>
                        <p className="text-sm text-[var(--fg-2)] leading-relaxed">
                          {report.codeAnalysis.ai_interpretation.executive_summary}
                        </p>
                        
                        {report.codeAnalysis.ai_interpretation.coverage_evaluation?.critical_files_reasoning?.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-[var(--border)]">
                            <p className="data-label mb-2">FILE CRITICI (AI REASONING)</p>
                            <div className="flex flex-col gap-3">
                              {report.codeAnalysis.ai_interpretation.coverage_evaluation.critical_files_reasoning.map((cf, idx) => (
                                <div key={idx} className="text-xs bg-[var(--bg)] p-3 border border-[var(--border)] rounded">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-mono text-[var(--danger)]">{cf.file}</span>
                                    <span className="font-mono opacity-80">{Math.round(cf.line_coverage_pct * 100)}%</span>
                                  </div>
                                  <p className="text-[var(--fg-3)] mt-1">{cf.ai_reasoning}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {report.codeAnalysis.ai_interpretation.static_analysis_evaluation?.key_issues_reasoning?.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-[var(--border)]">
                            <p className="data-label mb-2">KEY ISSUES (AI REASONING)</p>
                            <div className="flex flex-col gap-3">
                              {report.codeAnalysis.ai_interpretation.static_analysis_evaluation.key_issues_reasoning.map((ki, idx) => (
                                <div key={idx} className="text-xs bg-[var(--bg)] p-3 border border-[var(--border)] rounded">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="border-[var(--danger)] text-[var(--danger)] rounded-sm px-1.5 py-0">
                                      {ki.severity}
                                    </Badge>
                                    <span className="font-mono text-[var(--fg)]">{ki.file}:{ki.location?.line_start ?? '?'}</span>
                                  </div>
                                  <p className="text-[var(--fg-2)] font-medium mb-1">{ki.original_description}</p>
                                  <p className="text-[var(--fg-3)] italic">"{ki.ai_reasoning}"</p>
                                  {ki.suggested_resolution && (
                                    <p className="text-[var(--accent)] mt-1.5 flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3"/>{ki.suggested_resolution}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <IssuesList issues={report.codeAnalysis?.issues ?? report.qualityIssues ?? []} emptyMsg="Nessun problema di codice rilevato" />
              </TabsContent>
              <TabsContent value="security" className="px-6 mt-0">
                <IssuesList issues={report.securityAnalysis?.issues ?? report.securityIssues ?? []} emptyMsg="Nessun problema di sicurezza rilevato" />
              </TabsContent>
              <TabsContent value="docs" className="px-6 mt-0">
                {(report.documentationAnalysis?.completenessScore != null || report.documentationAnalysis?.coherenceScore != null) && (
                  <div className="flex gap-8 py-4 border-b border-[var(--border)] mb-2">
                    {report.documentationAnalysis.completenessScore != null && (
                      <div>
                        <p className="data-label mb-0.5">COMPLETEZZA</p>
                        <p className="font-mono text-xl font-300" style={{ color: 'var(--accent)', fontFeatureSettings: '"tnum"' }}>
                          {report.documentationAnalysis.completenessScore}<span className="text-sm text-[var(--fg-3)]">%</span>
                        </p>
                      </div>
                    )}
                    {report.documentationAnalysis.coherenceScore != null && (
                      <div>
                        <p className="data-label mb-0.5">COERENZA</p>
                        <p className="font-mono text-xl font-300" style={{ color: 'var(--accent)', fontFeatureSettings: '"tnum"' }}>
                          {report.documentationAnalysis.coherenceScore}<span className="text-sm text-[var(--fg-3)]">%</span>
                        </p>
                      </div>
                    )}
                  </div>
                )}
                <IssuesList issues={report.documentationAnalysis?.issues ?? []} emptyMsg="Documentazione completa" />
              </TabsContent>
              <TabsContent value="remediation" className="px-6 mt-0">
                <RemediationList remediations={report.remediations} analysisId={analysis!.id} onDecisionUpdate={load} />
              </TabsContent>
              <TabsContent value="history" className="px-6 mt-0">
                <AnalysisHistory repositoryId={id!} />
              </TabsContent>
            </div>
          </Tabs>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 text-center px-6">
            <div className="border border-[var(--border)] p-5 mb-6 inline-flex" style={{ borderRadius: 'var(--radius)' }}>
              <Zap className="h-8 w-8 text-[var(--fg-3)]" strokeWidth={1.25} />
            </div>
            <p className="font-display font-700 text-lg text-[var(--fg)] mb-2">Nessuna analisi disponibile</p>
            <p className="text-sm text-[var(--fg-3)] font-light mb-6 max-w-xs">
              Avvia la prima analisi per ottenere un report dettagliato su questo repository.
            </p>
            <Button size="sm" onClick={() => setAnalyzeOpen(true)}>
              <Zap className="h-3.5 w-3.5" />
              Analizza ora
            </Button>
          </div>
        )}
      </div>

      <AnalysisOptionsModal
        open={analyzeOpen}
        onOpenChange={setAnalyzeOpen}
        repositoryId={repo.id}
        repositoryName={repo.name}
        repositoryUrl={repo.url}
        onStarted={load}
      />
    </div>
  )
}

// ─── Issue list ──────────────────────────────────────────────
function IssuesList({ issues, emptyMsg }: { issues: Issue[]; emptyMsg: string }) {
  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-3 py-12 text-[var(--fg-3)]">
        <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
        <span className="text-sm font-light">{emptyMsg}</span>
      </div>
    )
  }
  return (
    <div>
      <p className="data-label py-4">{issues.length} ISSUE{issues.length > 1 ? 'S' : ''}</p>
      <div className="space-y-px">
        {issues.map((issue, i) => (
          <div
            key={i}
            className="border border-[var(--border)] bg-[var(--surface)] p-4 hover:bg-[var(--surface-2)] transition-colors"
            style={{
              borderLeft: `2px solid ${getSeverityVar(issue.severity)}`,
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div className="flex items-start justify-between gap-4 mb-1">
              <span className="font-body text-sm font-medium text-[var(--fg)]">
                {issue.title}
                {issue.url && (
                  <a href={issue.url} target="_blank" rel="noopener noreferrer" className="inline-flex ml-1.5 align-middle text-[var(--fg-3)] hover:text-[var(--accent)] transition-colors">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                {issue.category && (
                  <span
                    className="font-mono text-[10px] tracking-widest px-2 py-0.5 border"
                    style={{
                      color: 'var(--fg-2)',
                      borderColor: 'var(--border)',
                      background: 'var(--surface)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    {issue.category}
                  </span>
                )}
                <span
                  className="font-mono text-[10px] tracking-widest px-2 py-0.5 border"
                  style={{
                    color: getSeverityVar(issue.severity),
                    borderColor: `${getSeverityVar(issue.severity)}30`,
                    background: `${getSeverityVar(issue.severity)}10`,
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  {issue.severity.toUpperCase()}
                </span>
              </div>
            </div>
            <p className="text-xs text-[var(--fg-3)] font-light mb-1">{issue.description}</p>
            {issue.suggested_fix && (
              <div className="mt-2 mb-2 p-2 bg-[#1b1c1e] border border-[var(--border)] rounded-md font-mono text-[10px] text-[var(--fg-2)] whitespace-pre-wrap overflow-x-auto">
                <span className="text-[var(--success)] mr-2">fix:</span>
                {issue.suggested_fix}
              </div>
            )}
            {issue.file && (
              <p className="font-mono text-[10px] text-[var(--fg-3)] mt-1.5">
                {issue.file}
                {issue.line ? `:${issue.line}` : ''}
                {issue.location ? `:${issue.location.line_start}` : ''}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Remediation list ────────────────────────────────────────
function RemediationList({ remediations, analysisId, onDecisionUpdate }: {
  remediations: Remediation[]
  analysisId: string
  onDecisionUpdate: () => void
}) {
  const [pending, setPending] = useState<string | null>(null)

  const decide = async (remId: string, decision: 'accepted' | 'rejected') => {
    setPending(remId)
    try {
      await analysisApi.updateRemediationDecision(analysisId, remId, decision)
      toast.success(decision === 'accepted' ? 'Remediation accettata' : 'Rifiutata')
      onDecisionUpdate()
    } catch {
      toast.error('Errore aggiornamento')
    } finally {
      setPending(null)
    }
  }

  if (remediations.length === 0) {
    return (
      <div className="flex items-center gap-3 py-12 text-[var(--fg-3)]">
        <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
        <span className="text-sm font-light">Nessuna remediation suggerita</span>
      </div>
    )
  }

  return (
    <div>
      <p className="data-label py-4">{remediations.length} SUGGERIMENT{remediations.length > 1 ? 'I' : 'O'}</p>
      <div className="space-y-px">
        {remediations.map(r => (
          <div
            key={r.id}
            className="border border-[var(--border)] bg-[var(--surface)] p-4"
            style={{
              borderLeft: `2px solid ${getSeverityVar(r.severity)}`,
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <p className="text-sm font-medium text-[var(--fg)]">{r.title}</p>
                <p className="font-mono text-[10px] text-[var(--fg-3)] mt-0.5">{r.category}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {r.decision ? (
                  <Badge variant={r.decision === 'accepted' ? 'success' : 'secondary'}>
                    {r.decision === 'accepted' ? 'Accettata' : 'Rifiutata'}
                  </Badge>
                ) : (
                  <>
                    <Button
                      size="icon-sm" variant="ghost"
                      className="text-[var(--success)] hover:bg-[var(--success-dim)] hover:text-[var(--success)]"
                      onClick={() => decide(r.id, 'accepted')}
                      disabled={pending === r.id}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon-sm" variant="ghost"
                      className="text-[var(--danger)] hover:bg-[var(--danger-dim)] hover:text-[var(--danger)]"
                      onClick={() => decide(r.id, 'rejected')}
                      disabled={pending === r.id}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>
            <p className="text-xs text-[var(--fg-3)] font-light mb-2">{r.description}</p>
            {(() => {
              const cveMatch = r.reason?.match(/CVE-\d{4}-\d+/)
              const owaspMatch = (r.category + ' ' + (r.reason ?? '')).match(/OWASP[-\s]?(A\d{2})/)
              if (!cveMatch && !owaspMatch) return null
              return (
                <div className="flex flex-wrap gap-3 mb-2">
                  {cveMatch && (
                    <a href={`https://nvd.nist.gov/vuln/detail/${cveMatch[0]}`} target="_blank" rel="noopener noreferrer"
                       className="inline-flex items-center gap-1 font-mono text-[10px] text-[var(--fg-3)] hover:text-[var(--accent)] transition-colors">
                      <ExternalLink className="h-2.5 w-2.5" />{cveMatch[0]}
                    </a>
                  )}
                  {owaspMatch && (
                    <a href="https://owasp.org/Top10/" target="_blank" rel="noopener noreferrer"
                       className="inline-flex items-center gap-1 font-mono text-[10px] text-[var(--fg-3)] hover:text-[var(--accent)] transition-colors">
                      <ExternalLink className="h-2.5 w-2.5" />OWASP Top 10 {owaspMatch[1]}
                    </a>
                  )}
                </div>
              )
            })()}
            {r.currentCode && (
              <div className="space-y-2">
                <div>
                  <p className="font-mono text-[10px] text-[var(--danger)] mb-1">— CODICE ATTUALE</p>
                  <pre className="font-mono text-xs bg-[var(--danger-dim)] border border-[var(--danger-dim)] p-3 overflow-x-auto"
                       style={{ borderRadius: 'var(--radius-sm)' }}>
                    <code>{r.currentCode}</code>
                  </pre>
                </div>
                {r.suggestedCode && (
                  <div>
                    <p className="font-mono text-[10px] text-[var(--success)] mb-1">+ CODICE SUGGERITO</p>
                    <pre className="font-mono text-xs bg-[var(--success-dim)] border border-[var(--success-dim)] p-3 overflow-x-auto"
                         style={{ borderRadius: 'var(--radius-sm)' }}>
                      <code>{r.suggestedCode}</code>
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Analysis history ────────────────────────────────────────
function AnalysisHistory({ repositoryId }: { repositoryId: string }) {
  const [history, setHistory] = useState<Analysis[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    repositoriesApi.getHistory(repositoryId)
      .then(d => setHistory(d.items ?? []))
      .catch(() => toast.error('Errore caricamento storico'))
      .finally(() => setIsLoading(false))
  }, [repositoryId])

  if (isLoading) return <Skeleton className="h-32 w-full mt-4" />

  if (history.length === 0) {
    return (
      <div className="flex items-center gap-3 py-12 text-[var(--fg-3)]">
        <Clock className="h-4 w-4" />
        <span className="text-sm font-light">Nessuna analisi precedente</span>
      </div>
    )
  }

  const chartData = [...history]
    .filter(a => a.report)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(a => ({
      date: formatDateShort(a.date),
      quality: a.report!.qualityScore,
      security: a.report!.securityScore,
      docs: a.report!.documentationScore ?? null,
    }))

  return (
    <div>
      <p className="data-label py-4">STORICO ANALISI</p>

      {chartData.length >= 2 && (
        <div
          className="mb-5 border border-[var(--border)] bg-[var(--surface)] p-4"
          style={{ borderRadius: 'var(--radius-sm)' }}
        >
          <p className="data-label mb-3">ANDAMENTO SCORE</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'var(--fg-3)', fontFamily: 'var(--font-mono)' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: 'var(--fg-3)', fontFamily: 'var(--font-mono)' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                }}
                labelStyle={{ color: 'var(--fg-3)', marginBottom: 4 }}
              />
              <Legend
                iconType="plainline"
                iconSize={16}
                wrapperStyle={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-3)', paddingTop: 8 }}
              />
              <Line
                type="monotone"
                dataKey="quality"
                name="Qualità"
                stroke="var(--accent)"
                strokeWidth={1.5}
                dot={{ r: 3, fill: 'var(--accent)' }}
                activeDot={{ r: 4 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="security"
                name="Sicurezza"
                stroke="var(--danger)"
                strokeWidth={1.5}
                dot={{ r: 3, fill: 'var(--danger)' }}
                activeDot={{ r: 4 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="docs"
                name="Docs"
                stroke="var(--fg-3)"
                strokeWidth={1.5}
                dot={{ r: 3, fill: 'var(--fg-3)' }}
                activeDot={{ r: 4 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="space-y-px">
        {history.map(a => (
          <div
            key={a.id}
            className="border border-[var(--border)] bg-[var(--surface)] px-4 py-3 flex items-center justify-between"
            style={{ borderRadius: 'var(--radius-sm)' }}
          >
            <div>
              <p className="font-mono text-xs text-[var(--fg)]">{formatDate(a.date)}</p>
              {a.executionMetrics && (
                <p className="data-label mt-0.5">durata: {formatDuration(a.executionMetrics.total_time_seconds)}</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              {a.report && (
                <span className="font-mono text-lg font-300" style={{ color: 'var(--fg-2)', fontFeatureSettings: '"tnum"' }}>
                  {a.report.qualityScore}<span className="data-label">/100</span>
                </span>
              )}
              <AnalysisStatusBadge status={a.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
