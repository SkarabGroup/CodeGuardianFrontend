// Auth
export interface User {
  id: string
  username?: string
  email: string
  createdAt: string
  updatedAt?: string
  githubId?: string
  hasGithubLinked?: boolean
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  username: string
  email: string
  password: string
}

// Analysis
export type AnalysisStatus = 'not-analyzed' | 'pending' | 'in-progress' | 'completed' | 'failed'

export type IssueSeverity = 'critical' | 'warning' | 'info'

export type AnalysisArea = 'code' | 'security' | 'documentation'

export interface Issue {
  id?: string
  title: string
  description: string
  severity: IssueSeverity
  file?: string
  line?: number
  category?: string
  
  // Nuovi campi introdotti dal Code/Security/Doc Agent
  suggested_fix?: string
  url?: string
  location?: {
    line_start: number
    line_end: number
    column: number
  }
}

export interface Remediation {
  id: string
  title: string
  description: string
  severity: IssueSeverity
  category: string
  file?: string
  line?: number
  currentCode?: string
  suggestedCode?: string
  reason?: string
  decision?: 'accepted' | 'rejected' | 'pending'
}

export interface ExecutionMetrics {
  total_time_seconds: number
  initialization_time_seconds?: number
  execution_time_seconds?: number
  parsing_time_seconds?: number
  started_at: string
  completed_at: string
}

export interface CodeAgentStaticIssueLocation {
  line_start: number
  line_end: number
  column: number
}

export interface CodeAgentStaticIssue {
  file: string
  location: CodeAgentStaticIssueLocation
  rule: string
  category: string
  severity: string
  description: string
  suggested_fix: string
  url: string
}

export interface AIKeyIssueReasoning {
  file: string
  location: CodeAgentStaticIssueLocation
  rule: string
  severity: string
  original_description: string
  ai_reasoning: string
  suggested_resolution: string
}

export interface AICriticalFileReasoning {
  file: string
  line_coverage_pct: number
  missing_lines: number[]
  missing_branches: number
  ai_reasoning: string
}

export interface AIInterpretation {
  verdict: 'Critical' | 'Poor' | 'Fair' | 'Good' | 'Excellent' | string
  executive_summary: string
  static_analysis_evaluation: {
    total_issues_analyzed: number
    key_issues_reasoning: AIKeyIssueReasoning[]
  }
  coverage_evaluation: {
    overall_health: string
    critical_files_reasoning: AICriticalFileReasoning[]
  }
}

export interface CodeAnalysisSection {
  // Legacy / Mapped standard fields
  issues: Issue[]
  testCoverage?: number
  linesAnalyzed?: number
  summary?: string

  // New Code Agent Fields
  metadata?: {
    repository: string
    project_root?: string
    language?: string
    status: string
  }
  static_analysis?: {
    language: string
    tool: string
    total: number
    issues: CodeAgentStaticIssue[]
  }
  coverage?: {
    language: string
    tool: string
    overall_line_pct: number
    overall_branch_pct: number
    overall_function_pct: number
    files: any[]
    test_summary: any | null
    uncovered_files: string[]
  }
  ai_interpretation?: AIInterpretation
}

export interface SecurityAnalysisSection {
  issues: Issue[]
  owaspCompliance?: number
  vulnerableDependencies?: number
  summary?: string
}

export interface DocsApiViolation {
  file: string
  rule: string
  severity: string
  message: string
}

export interface DocsDiscrepancy {
  category: string
  documentation_source: string
  docs_claim: string
  actual_finding: string
  severity: string
}

export interface DocsMissingFile {
  referenced_path: string
  referenced_in: string
  context: string
  status: string
}

export interface DocsDependencyEntry {
  name: string
  version_pinned: string | null
  source_file: string
}

export interface DocsUndocumentedDependency {
  name: string
  found_in: string
}

export interface DocsMissingInConfig {
  name: string
  source_file?: string
  documented_in?: string
  severity: string
}

export interface DocsVersionMismatch extends DocsDependencyEntry {
  config_version?: string
}

export interface DocsDependencyAudit {
  readme_defined: DocsDependencyEntry[]
  config_defined: DocsDependencyEntry[]
  missing_in_config: DocsMissingInConfig[]
  undocumented_in_readme: DocsUndocumentedDependency[]
  version_mismatches: DocsVersionMismatch[]
}

export interface DocsAnalysisReport {
  metadata: { repository: string; status: string }
  API_standard_violations: DocsApiViolation[]
  docs_discrepancies: DocsDiscrepancy[]
  missing_files: DocsMissingFile[]
  dependency_audit: DocsDependencyAudit
}

export interface DocumentationAnalysisSection {
  issues: Issue[]
  completenessScore?: number
  coherenceScore?: number
  summary?: string
  report?: DocsAnalysisReport
}

export interface AnalysisReport {
  qualityScore: number
  securityScore: number
  documentationScore?: number
  criticalIssues: number
  warningIssues: number
  infoIssues: number
  codeAnalysis?: CodeAnalysisSection
  securityAnalysis?: SecurityAnalysisSection
  documentationAnalysis?: DocumentationAnalysisSection
  // Legacy fields (PoC compat)
  qualityIssues?: Issue[]
  securityIssues?: Issue[]
  bugIssues?: Issue[]
  remediations: Remediation[]
}

export interface Analysis {
  id: string
  repositoryId?: string
  repositoryName?: string
  analysisId?: string
  date: string
  status: AnalysisStatus
  areas?: AnalysisArea[]
  branch?: string
  commitHash?: string | null
  report?: AnalysisReport
  executionMetrics?: ExecutionMetrics
}

export interface Repository {
  id: string
  name: string
  description?: string
  url: string
  isPrivate?: boolean
  language?: string
  createdAt?: string
  updatedAt?: string
  lastAnalysis?: Analysis
  totalAnalyses?: number
  analysisHistory?: Analysis[]
}

// Ranking
export interface RankedRepository {
  rank: number
  repository: Repository
  score: number
  lastAnalyzed?: string
  scoreDelta?: number
}

// Export
export type ExportFormat = 'json' | 'pdf' | 'csv' | 'markdown'

// Pagination
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// WebSocket events
export interface AnalysisStartedEvent {
  repositoryId: string
  analysisId: string
}

export interface AnalysisProgressEvent {
  repositoryId: string
  analysisId: string
  progress: number
  message?: string
}

export interface AnalysisCompletedEvent {
  repositoryId: string
  analysisId: string
  report: AnalysisReport
}

export interface AnalysisFailedEvent {
  repositoryId: string
  analysisId: string
  error: string
}
