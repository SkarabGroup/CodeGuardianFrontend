import { describe, it, expect, vi, beforeEach } from 'vitest'
import { repositoriesApi } from '@/api/repositories'

const mockGet    = vi.hoisted(() => vi.fn())
const mockPost   = vi.hoisted(() => vi.fn())
const mockDelete = vi.hoisted(() => vi.fn())
const mockCalc   = vi.hoisted(() => vi.fn())

vi.mock('@/api/gateway', () => ({
  gateway: { get: mockGet, post: mockPost, delete: mockDelete },
  tokenStorage: { getAccess: vi.fn(), getRefresh: vi.fn(), setAccess: vi.fn(), setRefresh: vi.fn(), clear: vi.fn() },
}))

vi.mock('@/api/calculateScores', () => ({
  calculateScores: mockCalc,
}))

const defaultScores = { reportObj: { qualityScore: 80, remediations: [] }, extMetrics: { total_time_seconds: 60 } }

const collectionA = { url: 'https://github.com/org/repo-a', name: 'repo-a' }
const analysisStub = { analysisId: 'an-1', status: 'COMPLETED', createdAt: '2025-01-01T00:00:00.000Z', fullReport: { qualityScore: 80, remediations: [] } }

describe('repositoriesApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockCalc.mockReturnValue(defaultScores)
  })

  // ── list ──────────────────────────────────────────────────────

  it('list returns empty array when collections fetch fails', async () => {
    mockGet.mockRejectedValue(new Error('network'))
    const result = await repositoriesApi.list()
    expect(result).toEqual([])
  })

  it('list returns empty array when collections is empty', async () => {
    mockGet.mockResolvedValue({ data: { collections: [] } })
    const result = await repositoriesApi.list()
    expect(result).toEqual([])
  })

  it('list maps repos from full-details responses', async () => {
    mockGet
      .mockResolvedValueOnce({ data: { collections: [collectionA] } })
      .mockResolvedValueOnce({ data: { data: { name: 'repo-a', analyses: [analysisStub] } } })
    const result = await repositoriesApi.list()
    expect(result).toHaveLength(1)
    expect(result[0].url).toBe(collectionA.url)
    expect(result[0].name).toBe('repo-a')
    expect(result[0].lastAnalysis?.status).toBe('completed')
  })

  it('list uses url basename when no name in payload', async () => {
    mockGet
      .mockResolvedValueOnce({ data: { collections: [{ url: 'https://github.com/org/my-repo' }] } })
      .mockResolvedValueOnce({ data: { data: { analyses: [] } } })
    const result = await repositoriesApi.list()
    expect(result[0].name).toBe('my-repo')
  })

  it('list sets undefined lastAnalysis when analyses is empty and no lastAnalysisDate', async () => {
    mockGet
      .mockResolvedValueOnce({ data: { collections: [collectionA] } })
      .mockResolvedValueOnce({ data: { data: { analyses: [] } } })
    const result = await repositoriesApi.list()
    expect(result[0].lastAnalysis).toBeUndefined()
  })

  it('list handles full-details failure gracefully', async () => {
    mockGet
      .mockResolvedValueOnce({ data: { collections: [collectionA] } })
      .mockRejectedValueOnce(new Error('fail'))
    const result = await repositoriesApi.list()
    expect(result).toHaveLength(1)
    expect(result[0].lastAnalysis).toBeUndefined()
  })

  it('list maps mapStatus QUEUED to pending', async () => {
    const queuedAnalysis = { ...analysisStub, status: 'QUEUED' }
    mockGet
      .mockResolvedValueOnce({ data: { collections: [collectionA] } })
      .mockResolvedValueOnce({ data: { data: { analyses: [queuedAnalysis] } } })
    const result = await repositoriesApi.list()
    expect(result[0].lastAnalysis?.status).toBe('pending')
  })

  it('list maps unknown status to pending via mapStatus fallback', async () => {
    const unknownStatus = { ...analysisStub, status: 'UNKNOWN_NEW_STATUS' }
    mockGet
      .mockResolvedValueOnce({ data: { collections: [collectionA] } })
      .mockResolvedValueOnce({ data: { data: { analyses: [unknownStatus] } } })
    const result = await repositoriesApi.list()
    expect(result[0].lastAnalysis?.status).toBe('pending')
  })

  // ── get ───────────────────────────────────────────────────────

  it('get returns bare repo when API throws', async () => {
    mockGet.mockRejectedValue(new Error('network'))
    const result = await repositoriesApi.get(encodeURIComponent('https://github.com/org/repo'))
    expect(result.lastAnalysis).toBeUndefined()
    expect(result.url).toBe('https://github.com/org/repo')
  })

  it('get uses requestedAnalysisId from URL query param to pick a specific analysis', async () => {
    vi.stubGlobal('location', { search: '?analysisId=an-2', href: 'http://localhost/?analysisId=an-2' })
    const analyses = [
      { analysisId: 'an-1', status: 'COMPLETED', createdAt: '2025-01-02T00:00:00.000Z', fullReport: { qualityScore: 80, remediations: [] } },
      { analysisId: 'an-2', status: 'COMPLETED', createdAt: '2025-01-01T00:00:00.000Z', fullReport: { qualityScore: 60, remediations: [] } },
    ]
    mockGet.mockResolvedValue({ data: { success: true, data: { name: 'repo', analyses } } })
    const result = await repositoriesApi.get(encodeURIComponent('https://github.com/org/repo'))
    expect(result.lastAnalysis?.id).toBe('an-2')
    vi.unstubAllGlobals()
  })

  it('get maps lastAnalysis from fullReport', async () => {
    mockGet.mockResolvedValue({
      data: {
        success: true,
        data: {
          name: 'repo',
          analyses: [{
            analysisId: 'an-1',
            status: 'COMPLETED',
            createdAt: '2025-01-01T00:00:00.000Z',
            fullReport: { qualityScore: 90, remediations: [] },
          }],
        },
      },
    })
    const result = await repositoriesApi.get(encodeURIComponent('https://github.com/org/repo'))
    expect(result.lastAnalysis?.id).toBe('an-1')
    expect(result.lastAnalysis?.report?.qualityScore).toBe(90)
    expect(result.lastAnalysis?.status).toBe('completed')
  })

  it('get returns undefined lastAnalysis when analyses array is empty', async () => {
    mockGet.mockResolvedValue({
      data: { success: true, data: { name: 'repo', analyses: [] } },
    })
    const result = await repositoriesApi.get(encodeURIComponent('https://github.com/org/repo'))
    expect(result.lastAnalysis).toBeUndefined()
  })

  it('get builds report from codeReportJson with static_analysis issues', async () => {
    const analysis = {
      analysisId: 'an-2',
      status: 'completed',
      createdAt: '2025-01-01T00:00:00.000Z',
      codeReportJson: {
        analysis_report: {
          static_analysis: {
            issues: [{ rule: 'no-console', severity: 'warning', description: 'use logger', category: 'STYLE' }],
            total: 1,
          },
          ai_interpretation: { verdict: 'FAIR' },
        },
      },
      docsReportJson: {
        analysis_report: {
          API_standard_violations: [{ rule: 'R1', message: 'Missing OpenAPI', severity: 'error', file: 'api.ts' }],
          docs_discrepancies: [{ docs_claim: 'returns 200', actual_finding: 'returns 404', category: 'STATUS' }],
          missing_files: [{ referenced_path: 'docs/api.md', referenced_in: 'README.md', context: 'API reference' }],
        },
      },
      secReportJson: {
        analysis_report: {
          trivy: [{ package_name: 'lodash', package_version: '4.0.0', severity: 'high', description: 'RCE' }],
          semgrep: [{ rule_id: 'sql-injection', severity: 'critical', description: 'SQL injection' }],
          grype: [{ rule_id: 'g-1', severity: 'medium', description: 'Medium severity' }],
        },
      },
    }
    mockGet.mockResolvedValue({ data: { success: true, data: { name: 'repo', analyses: [analysis] } } })
    const result = await repositoriesApi.get(encodeURIComponent('https://github.com/org/repo'))
    expect(result.lastAnalysis?.report).toBeDefined()
    expect(result.lastAnalysis?.report?.qualityScore).toBeGreaterThanOrEqual(0)
    expect(result.lastAnalysis?.report?.documentationAnalysis).toBeDefined()
    expect(result.lastAnalysis?.report?.securityAnalysis).toBeDefined()
  })

  it('get builds report from codeReportJson using key_issues_reasoning fallback', async () => {
    const analysis = {
      analysisId: 'an-3',
      status: 'completed',
      createdAt: '2025-01-01T00:00:00.000Z',
      codeReportJson: {
        analysis_report: {
          static_analysis: { issues: [], total: 0 },
          ai_interpretation: {
            verdict: 'POOR',
            static_analysis_evaluation: {
              key_issues_reasoning: [{ rule: 'no-eval', severity: 'high', original_description: 'eval is evil', file: 'app.ts' }],
            },
          },
        },
      },
    }
    mockGet.mockResolvedValue({ data: { success: true, data: { name: 'repo', analyses: [analysis] } } })
    const result = await repositoriesApi.get(encodeURIComponent('https://github.com/org/repo'))
    expect(result.lastAnalysis?.report?.qualityScore).toBeDefined()
  })

  it('get builds report with default verdict (no ai_interpretation)', async () => {
    const analysis = {
      analysisId: 'an-def',
      status: 'completed',
      createdAt: '2025-01-01T00:00:00.000Z',
      codeReportJson: {
        analysis_report: {
          static_analysis: { issues: [{ severity: 'warning', rule: 'no-console' }], total: 1 },
        },
      },
    }
    mockGet.mockResolvedValue({ data: { success: true, data: { name: 'repo', analyses: [analysis] } } })
    const result = await repositoriesApi.get(encodeURIComponent('https://github.com/org/repo'))
    // No POOR/FAIR verdict → default: max(0, 100 - issues*2) = 98
    expect(result.lastAnalysis?.report?.qualityScore).toBe(98)
  })

  it('get computes qualityScore 0 when only docsReportJson is present (no codeRep)', async () => {
    const analysis = {
      analysisId: 'an-docs',
      status: 'completed',
      createdAt: '2025-01-01T00:00:00.000Z',
      docsReportJson: {
        API_standard_violations: [{ severity: 'error', message: 'Missing schema' }],
      },
    }
    mockGet.mockResolvedValue({ data: { success: true, data: { name: 'repo', analyses: [analysis] } } })
    const result = await repositoriesApi.get(encodeURIComponent('https://github.com/org/repo'))
    expect(result.lastAnalysis?.report?.qualityScore).toBe(0)
  })

  it('get falls back to overallScore when no reports and status is COMPLETED', async () => {
    const analysis = { analysisId: 'an-4', status: 'COMPLETED', createdAt: '2025-01-01T00:00:00.000Z', overallScore: 55, securityScore: 40, docsScore: 70 }
    mockGet.mockResolvedValue({ data: { success: true, data: { name: 'repo', analyses: [analysis] } } })
    const result = await repositoriesApi.get(encodeURIComponent('https://github.com/org/repo'))
    expect(result.lastAnalysis?.report?.qualityScore).toBe(55)
  })

  // ── create ────────────────────────────────────────────────────

  it('create posts and returns new repository', async () => {
    mockPost.mockResolvedValue({ data: { success: true } })
    const result = await repositoriesApi.create({ name: 'my-repo', url: 'https://github.com/org/my-repo' })
    expect(mockPost).toHaveBeenCalledWith('/repositories', expect.objectContaining({ url: 'https://github.com/org/my-repo' }))
    expect(result.name).toBe('my-repo')
  })

  it('create throws when success is false', async () => {
    mockPost.mockResolvedValue({ data: { success: false, message: 'Già esistente' } })
    await expect(repositoriesApi.create({ name: 'r', url: 'https://github.com/org/r' })).rejects.toThrow('Già esistente')
  })

  it('create throws with default message when no message in response', async () => {
    mockPost.mockResolvedValue({ data: { success: false } })
    await expect(repositoriesApi.create({ name: 'r', url: 'https://github.com/org/r' })).rejects.toThrow('Errore durante la creazione')
  })

  // ── update ────────────────────────────────────────────────────

  it('update returns updated repository object without calling API', async () => {
    const result = await repositoriesApi.update(encodeURIComponent('https://github.com/org/r'), { name: 'new-name' })
    expect(result.name).toBe('new-name')
    expect(mockPost).not.toHaveBeenCalled()
    expect(mockGet).not.toHaveBeenCalled()
  })

  // ── delete ────────────────────────────────────────────────────

  it('delete calls DELETE with encoded URL', async () => {
    mockDelete.mockResolvedValue({})
    await repositoriesApi.delete(encodeURIComponent('https://github.com/org/repo'))
    expect(mockDelete).toHaveBeenCalledWith(expect.stringContaining('/repositories/'))
  })

  // ── getRanking ────────────────────────────────────────────────

  it('getRanking returns repos sorted by score descending', async () => {
    const repoA = { ...collectionA, url: 'https://github.com/org/a' }
    const repoB = { url: 'https://github.com/org/b', name: 'b' }
    mockCalc
      .mockReturnValueOnce({ reportObj: { qualityScore: 60, remediations: [] }, extMetrics: { total_time_seconds: 60 } })
      .mockReturnValueOnce({ reportObj: { qualityScore: 90, remediations: [] }, extMetrics: { total_time_seconds: 60 } })
    mockGet
      .mockResolvedValueOnce({ data: { collections: [repoA, repoB] } })
      .mockResolvedValueOnce({ data: { data: { name: 'a', analyses: [analysisStub] } } })
      .mockResolvedValueOnce({ data: { data: { name: 'b', analyses: [analysisStub] } } })
    const result = await repositoriesApi.getRanking()
    expect(result[0].score).toBe(90)
    expect(result[0].rank).toBe(1)
    expect(result[1].rank).toBe(2)
  })

  it('getRanking filters repos without reports', async () => {
    mockGet
      .mockResolvedValueOnce({ data: { collections: [collectionA] } })
      .mockResolvedValueOnce({ data: { data: { analyses: [] } } })
    const result = await repositoriesApi.getRanking()
    expect(result).toEqual([])
  })

  it('getRanking returns empty array on error (calculateScores throws in list)', async () => {
    mockGet
      .mockResolvedValueOnce({ data: { collections: [collectionA] } })
      .mockResolvedValueOnce({ data: { data: { analyses: [analysisStub] } } })
    mockCalc.mockImplementationOnce(() => { throw new Error('score failure') })
    const result = await repositoriesApi.getRanking()
    expect(result).toEqual([])
  })

  // ── startAnalysis ─────────────────────────────────────────────

  it('startAnalysis posts to /analysis with all defaults', async () => {
    mockPost.mockResolvedValue({ data: { id: 'job-1' } })
    const result = await repositoriesApi.startAnalysis(encodeURIComponent('https://github.com/org/repo'))
    expect(mockPost).toHaveBeenCalledWith('/analysis', expect.objectContaining({
      requestedCode: true,
      requestedSecurity: true,
      requestedDocumentation: true,
    }))
    expect(result.analysisId).toBe('job-1')
  })

  it('startAnalysis posts selected areas only', async () => {
    mockPost.mockResolvedValue({ data: { id: 'job-2' } })
    await repositoriesApi.startAnalysis('id', { areas: ['code'], repositoryUrl: 'https://github.com/org/r' })
    expect(mockPost).toHaveBeenCalledWith('/analysis', expect.objectContaining({
      requestedCode: true,
      requestedSecurity: false,
      requestedDocumentation: false,
      repoUrl: 'https://github.com/org/r',
    }))
  })

  // ── getHistory ────────────────────────────────────────────────

  it('getHistory returns paginated analyses', async () => {
    const a = { analysisId: 'h-1', status: 'COMPLETED', createdAt: '2025-01-01T00:00:00.000Z', requestedCode: true }
    mockGet.mockResolvedValue({ data: { data: { analyses: [a] } } })
    const result = await repositoriesApi.getHistory(encodeURIComponent('https://github.com/org/repo'))
    expect(result.items).toHaveLength(1)
    expect(result.items[0].id).toBe('h-1')
    expect(result.totalPages).toBe(1)
  })

  it('getHistory reads analyses from flat data when no data.data wrapper', async () => {
    const a = { analysisId: 'h-flat', status: 'COMPLETED', timestamp: '2025-03-01T00:00:00.000Z' }
    mockGet.mockResolvedValue({ data: { analyses: [a] } })
    const result = await repositoriesApi.getHistory(encodeURIComponent('https://github.com/org/repo'))
    expect(result.items).toHaveLength(1)
    expect(result.items[0].id).toBe('h-flat')
  })

  it('getHistory returns page/limit from params', async () => {
    mockGet.mockResolvedValue({ data: { data: { analyses: [] } } })
    const result = await repositoriesApi.getHistory(encodeURIComponent('https://github.com/org/repo'), { page: 2, limit: 5 })
    expect(result.page).toBe(2)
    expect(result.limit).toBe(5)
  })

  it('getHistory returns empty on error', async () => {
    mockGet.mockRejectedValue(new Error('fail'))
    const result = await repositoriesApi.getHistory(encodeURIComponent('https://github.com/org/repo'))
    expect(result.items).toEqual([])
    expect(result.total).toBe(0)
  })

  // ── compareAnalyses ───────────────────────────────────────────

  it('compareAnalyses returns empty object', async () => {
    const result = await repositoriesApi.compareAnalyses('id', ['a1', 'a2'])
    expect(result).toEqual({})
  })
})
