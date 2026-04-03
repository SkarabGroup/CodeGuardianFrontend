import type {
  User, Repository, Analysis, AnalysisReport,
  RankedRepository, PaginatedResponse,
} from '@/types'

// ─── Auth ────────────────────────────────────────────────────
export const MOCK_USER: User = {
  id: 'usr_demo_001',
  username: 'demo_user',
  email: 'test@codeguardian.dev',
  createdAt: '2025-09-15T10:00:00Z',
  githubId: '8472910',
  hasGithubLinked: true,
}

export const MOCK_TOKENS = {
  accessToken:  'mock_access_token_eyJhbGciOiJIUzI1NiJ9',
  refreshToken: 'mock_refresh_token_eyJhbGciOiJIUzI1NiJ9',
}

// ─── Reports ──────────────────────────────────────────────────
function makeReport(opts: {
  quality: number
  security: number
  docs: number
  critical: number
  warnings: number
  infos: number
}): AnalysisReport {
  return {
    qualityScore:       opts.quality,
    securityScore:      opts.security,
    documentationScore: opts.docs,
    criticalIssues:     opts.critical,
    warningIssues:      opts.warnings,
    infoIssues:         opts.infos,
    codeAnalysis: {
      issues: [
        {
          title: 'Funzione con complessità ciclomatica elevata',
          description: 'La funzione `processPayment()` ha complessità 24, soglia massima consigliata: 10. Considerare di scomporla in funzioni più piccole.',
          severity: 'critical',
          file: 'src/payments/processor.ts',
          line: 142,
          category: 'complexity',
        },
        {
          title: 'Blocco catch vuoto',
          description: 'Gli errori vengono ignorati silenziosamente. Aggiungere almeno un log o re-throw dell\'eccezione.',
          severity: 'warning',
          file: 'src/utils/api-client.ts',
          line: 87,
          category: 'error-handling',
        },
        {
          title: 'Variabile non utilizzata',
          description: '`tempBuffer` viene dichiarata ma mai letta nel corpo della funzione.',
          severity: 'info',
          file: 'src/services/cache.ts',
          line: 23,
          category: 'dead-code',
        },
        {
          title: 'Test coverage insufficiente',
          description: 'Il modulo `auth/` ha una copertura del 34%, ben sotto la soglia minima dell\'80%.',
          severity: 'warning',
          file: 'src/auth/',
          category: 'coverage',
        },
      ],
      testCoverage: 67,
      linesAnalyzed: 12480,
    },
    securityAnalysis: {
      issues: [
        {
          title: 'Dipendenza con CVE critica: lodash@4.17.15',
          description: 'CVE-2021-23337: Prototype Pollution in lodash. Aggiornare a lodash@4.17.21 o superiore.',
          severity: 'critical',
          file: 'package.json',
          category: 'CVE',
        },
        {
          title: 'Token JWT senza scadenza',
          description: 'I token generati non includono il campo `exp`. In caso di compromissione, non sarà possibile invalidarli.',
          severity: 'critical',
          file: 'src/auth/token.service.ts',
          line: 56,
          category: 'OWASP-A07',
        },
        {
          title: 'Input utente non sanitizzato prima della query SQL',
          description: 'Il parametro `userId` viene interpolato direttamente nella query senza prepared statement.',
          severity: 'critical',
          file: 'src/db/user-repository.ts',
          line: 31,
          category: 'OWASP-A03',
        },
        {
          title: 'Header CORS troppo permissivo',
          description: '`Access-Control-Allow-Origin: *` non è appropriato per un\'API autenticata.',
          severity: 'warning',
          file: 'src/main.ts',
          line: 14,
          category: 'OWASP-A05',
        },
        {
          title: 'Dipendenza deprecata: moment@2.29.1',
          description: 'Moment.js è deprecato. Considerare dayjs o date-fns come sostituto.',
          severity: 'info',
          file: 'package.json',
          category: 'deprecated',
        },
      ],
      owaspCompliance: opts.security,
      vulnerableDependencies: opts.critical,
    },
    documentationAnalysis: {
      issues: [
        {
          title: 'API endpoint non documentata: POST /users/reset-password',
          description: 'L\'endpoint non ha né JSDoc né entry nella specifica OpenAPI.',
          severity: 'warning',
          file: 'src/users/users.controller.ts',
          line: 88,
          category: 'api-coverage',
        },
        {
          title: 'README mancante per il modulo payments/',
          description: 'I moduli con business logic critica dovrebbero avere documentazione dedicata.',
          severity: 'info',
          file: 'src/payments/',
          category: 'completeness',
        },
      ],
      completenessScore: opts.docs,
      coherenceScore: Math.min(100, opts.docs + 5),
    },
    remediations: [
      {
        id: 'rem_001',
        title: 'Aggiorna lodash alla versione 4.17.21',
        description: 'La versione attuale ha una CVE critica che permette Prototype Pollution. L\'aggiornamento risolve la vulnerabilità senza breaking changes.',
        severity: 'critical',
        category: 'Security / Dependency',
        file: 'package.json',
        currentCode:   '"lodash": "^4.17.15"',
        suggestedCode: '"lodash": "^4.17.21"',
        reason: 'CVE-2021-23337 — Prototype Pollution in lodash <4.17.21',
        decision: 'pending',
      },
      {
        id: 'rem_002',
        title: 'Aggiungere scadenza al JWT',
        description: 'Imposta il campo `expiresIn` durante la generazione del token per limitare la finestra di esposizione in caso di leak.',
        severity: 'critical',
        category: 'Security / Auth',
        file: 'src/auth/token.service.ts',
        line: 56,
        currentCode:  `jwt.sign({ userId }, SECRET)`,
        suggestedCode:`jwt.sign({ userId }, SECRET, { expiresIn: '15m' })`,
        reason: 'Senza scadenza, un token compromesso non può essere invalidato.',
        decision: 'pending',
      },
      {
        id: 'rem_003',
        title: 'Usare prepared statement nella query utente',
        description: 'Sostituire l\'interpolazione diretta con parametri bindati per prevenire SQL injection.',
        severity: 'critical',
        category: 'Security / OWASP-A03',
        file: 'src/db/user-repository.ts',
        line: 31,
        currentCode:  'db.query(`SELECT * FROM users WHERE id = ${userId}`)',
        suggestedCode:'db.query("SELECT * FROM users WHERE id = $1", [userId])',
        reason: 'SQL injection — OWASP Top 10 A03:2021.',
        decision: 'accepted',
      },
      {
        id: 'rem_004',
        title: 'Scomporre processPayment() in sotto-funzioni',
        description: 'Estrarre le fasi di validazione, autorizzazione e registrazione in funzioni dedicate per ridurre la complessità ciclomatica.',
        severity: 'warning',
        category: 'Code Quality / Complexity',
        file: 'src/payments/processor.ts',
        line: 142,
        reason: 'Complessità ciclomatica 24 — soglia 10.',
        decision: 'pending',
      },
    ],
  }
}

// ─── Analyses ─────────────────────────────────────────────────
function makeAnalysis(id: string, repoId: string, daysAgo: number, opts: Parameters<typeof makeReport>[0]): Analysis {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return {
    id,
    repositoryId: repoId,
    date: date.toISOString(),
    status: 'completed',
    areas: ['code', 'security', 'documentation'],
    branch: 'main',
    commitHash: id.endsWith('prev') || id.endsWith('old') ? null : id === 'ana_001' ? 'a3f8b2c' : id === 'ana_002' ? 'd9e1f04' : id === 'ana_003' ? 'c72a5b1' : null,
    report: makeReport(opts),
    executionMetrics: {
      total_time_seconds:        222,
      initialization_time_seconds: 8,
      execution_time_seconds:    194,
      parsing_time_seconds:       20,
      started_at:  new Date(date.getTime() - 222_000).toISOString(),
      completed_at: date.toISOString(),
    },
  }
}

// ─── Repositories ─────────────────────────────────────────────
export const MOCK_REPOS: Repository[] = [
  {
    id: 'repo_001',
    name: 'codeguardian-backend',
    description: 'NestJS API gateway per la piattaforma CodeGuardian',
    url: 'https://github.com/SkarabGroup/CodeGuardianAnalysisMicroservice',
    isPrivate: false,
    language: 'TypeScript',
    createdAt: '2025-08-01T09:00:00Z',
    lastAnalysis: makeAnalysis('ana_001', 'repo_001', 1, { quality: 87, security: 62, docs: 91, critical: 3, warnings: 12, infos: 8 }),
    totalAnalyses: 14,
  },
  {
    id: 'repo_002',
    name: 'auth-service',
    description: 'Microservizio di autenticazione e gestione account utente',
    url: 'https://github.com/SkarabGroup/CodeGuardianAccountAdministrationMicroservice',
    isPrivate: false,
    language: 'TypeScript',
    createdAt: '2025-08-15T09:00:00Z',
    lastAnalysis: makeAnalysis('ana_002', 'repo_002', 3, { quality: 94, security: 88, docs: 79, critical: 0, warnings: 4, infos: 11 }),
    totalAnalyses: 7,
  },
  {
    id: 'repo_003',
    name: 'data-pipeline',
    description: 'ETL pipeline per ingestione e trasformazione dati da sorgenti esterne',
    url: 'https://github.com/SkarabGroup/data-pipeline',
    isPrivate: true,
    language: 'Python',
    createdAt: '2025-07-10T09:00:00Z',
    lastAnalysis: makeAnalysis('ana_003', 'repo_003', 7, { quality: 53, security: 41, docs: 38, critical: 8, warnings: 21, infos: 14 }),
    totalAnalyses: 22,
  },
  {
    id: 'repo_004',
    name: 'mobile-app',
    description: 'Applicazione React Native per iOS e Android',
    url: 'https://github.com/SkarabGroup/mobile-app',
    isPrivate: true,
    language: 'TypeScript',
    createdAt: '2025-09-01T09:00:00Z',
    lastAnalysis: {
      id: 'ana_004',
      repositoryId: 'repo_004',
      date: new Date(Date.now() - 2 * 60_000).toISOString(),
      status: 'in-progress',
      areas: ['code', 'security'],
    },
    totalAnalyses: 3,
  },
  {
    id: 'repo_005',
    name: 'legacy-monolith',
    description: 'Sistema legacy in migrazione verso microservizi',
    url: 'https://github.com/SkarabGroup/legacy-monolith',
    isPrivate: false,
    language: 'Java',
    createdAt: '2024-03-01T09:00:00Z',
    lastAnalysis: undefined,
    totalAnalyses: 0,
  },
]

// ─── History ──────────────────────────────────────────────────
const historyItems: Analysis[] = [
  makeAnalysis('ana_001',      'repo_001', 1,  { quality: 87, security: 62, docs: 91, critical: 3, warnings: 12, infos: 8 }),
  makeAnalysis('ana_002',      'repo_002', 3,  { quality: 94, security: 88, docs: 79, critical: 0, warnings:  4, infos: 11 }),
  makeAnalysis('ana_003',      'repo_003', 7,  { quality: 53, security: 41, docs: 38, critical: 8, warnings: 21, infos: 14 }),
  makeAnalysis('ana_001_prev', 'repo_001', 14, { quality: 80, security: 58, docs: 85, critical: 4, warnings: 15, infos: 9 }),
  makeAnalysis('ana_002_prev', 'repo_002', 18, { quality: 90, security: 83, docs: 72, critical: 1, warnings:  6, infos: 13 }),
  makeAnalysis('ana_003_prev', 'repo_003', 25, { quality: 47, security: 35, docs: 30, critical:10, warnings: 26, infos: 18 }),
  makeAnalysis('ana_001_old',  'repo_001', 30, { quality: 74, security: 55, docs: 80, critical: 5, warnings: 18, infos: 7 }),
]

export const MOCK_HISTORY: PaginatedResponse<Analysis> = {
  items: historyItems,
  total: historyItems.length,
  page: 1,
  limit: 20,
  totalPages: 1,
}

// ─── Ranking ──────────────────────────────────────────────────
export const MOCK_RANKING: RankedRepository[] = [
  {
    rank: 1,
    repository: MOCK_REPOS[1], // auth-service
    score: 94,
    lastAnalyzed: MOCK_REPOS[1].lastAnalysis?.date,
    scoreDelta: +4,  // 94 vs 90 precedente
  },
  {
    rank: 2,
    repository: MOCK_REPOS[0], // codeguardian-backend
    score: 87,
    lastAnalyzed: MOCK_REPOS[0].lastAnalysis?.date,
    scoreDelta: +7,  // 87 vs 80 precedente
  },
  {
    rank: 3,
    repository: MOCK_REPOS[2], // data-pipeline
    score: 53,
    lastAnalyzed: MOCK_REPOS[2].lastAnalysis?.date,
    scoreDelta: +6,  // 53 vs 47 precedente
  },
]

// ─── API key ──────────────────────────────────────────────────
export const MOCK_API_KEY = 'cg_live_sk_a7f2e891b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7'
