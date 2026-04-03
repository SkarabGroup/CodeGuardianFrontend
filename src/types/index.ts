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

export interface CodeAnalysisSection {
  issues: Issue[]
  testCoverage?: number
  linesAnalyzed?: number
  summary?: string
}

export interface SecurityAnalysisSection {
  issues: Issue[]
  owaspCompliance?: number
  vulnerableDependencies?: number
  summary?: string
}

export interface DocumentationAnalysisSection {
  issues: Issue[]
  completenessScore?: number
  coherenceScore?: number
  summary?: string
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
