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

  it('list uses collection analyses string array for ID fallback if no analysisItem has an ID', async () => {
    mockGet
      .mockResolvedValueOnce({
        data: { collections: [{ url: 'https://github.com/org/repo', analyses: ['FALLBACK-ID'] }] }
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            analyses: [{ status: 'completed', timestamp: '2023-01-01' }]
          }
        }
      })
    
    const result = await repositoriesApi.list()
    expect(result[0].lastAnalysis?.id).toBe('FALLBACK-ID')
  })

  it('list uses NO-ANALYSIS fallback when collection analyses is empty and no analysisId on item', async () => {
    mockGet
      .mockResolvedValueOnce({
        data: { collections: [{ url: 'https://github.com/org/repo' }] }
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            analyses: [{ status: 'completed', timestamp: '2023-01-01' }]
          }
        }
      })
    
    const result = await repositoriesApi.list()
    expect(result[0].lastAnalysis?.id).toBe('NO-ANALYSIS-https://github.com/org/repo')
  })

  it('list handles full-details failure gracefully', async () => {
    mockGet
      .mockResolvedValueOnce({ data: { collections: [collectionA] } })
      .mockRejectedValueOnce(new Error('fail'))
    const result = await repositoriesApi.list()
    expect(result[0].name).toBe('repo-a')
  })

  it('list handles analysis defaults when timestamp, createdAt and c.lastAnalysisDate are ALL missing', async () => {
    mockGet
      .mockResolvedValueOnce({
        data: { collections: [{ url: 'https://github.com/a' }] }
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            analyses: [{ status: 'not-analyzed' }] 
          }
        }
      })
    const result = await repositoriesApi.list()
    expect(result[0].lastAnalysis).toBeDefined()
    expect(result[0].lastAnalysis!.date).toBeDefined() 
  })

  it('list sets analysis when only c.lastAnalysisDate exists', async () => {
    mockGet
      .mockResolvedValueOnce({
        data: { collections: [{ url: 'https://github.com/b', lastAnalysisDate: '2023-01-02', analyses: ['COL-ID-1'] }] }
      })
      .mockResolvedValueOnce({
        data: { data: { analyses: [] } }
      })
    const result = await repositoriesApi.list()
    expect(result[0].lastAnalysis!.date).toBe('2023-01-02')
    expect(result[0].lastAnalysis!.status).toBe('not-analyzed') 
    expect(result[0].lastAnalysis!.id).toBe('COL-ID-1')
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

  it('startAnalysis returns empty string if no id in response', async () => {
    mockPost.mockResolvedValue({ data: {} })
    const result = await repositoriesApi.startAnalysis('id')
    expect(result.analysisId).toBe('')
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

  it('getHistory handles missing qualityScore and fallback to overallScore', async () => {
    const a = { analysisId: 'h-2', status: 'COMPLETED', timestamp: '2025-01-01T00:00:00.000Z', overallScore: 42, requestedCode: false, requestedSecurity: true, requestedDocumentation: false }
    mockGet.mockResolvedValueOnce({ data: { data: { analyses: [a] } } })
    mockCalc.mockReturnValueOnce({ reportObj: {}, extMetrics: {} })
    const result = await repositoriesApi.getHistory('id')
    
    expect(result.items[0].score).toBe(42)
    expect(result.items[0].areas).toEqual(['security'])
    expect(result.items[0].startedAt).toBe('2025-01-01T00:00:00.000Z')
    expect(result.items[0].date).toBe('2025-01-01T00:00:00.000Z')
  })

  it('getHistory handles complete fallback defaults for analysis item', async () => {
    const b = { analysisId: 'h-3', status: 'COMPLETED' } 
    mockGet.mockResolvedValueOnce({ data: { data: { analyses: [b] } } })
    mockCalc.mockReturnValueOnce({})
    const result = await repositoriesApi.getHistory('id')
    
    expect(result.items[0].score).toBe(0)
    expect(result.items[0].issuesCount).toBe(0)
    expect(result.items[0].areas).toEqual([])
    expect(result.items[0].date).toBeDefined()
    expect(result.items[0].startedAt).toBeDefined()
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

  // ── Missing Coverage scenarios ─────────────────────────────────

  it('get builds report from partial items without fullReport', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          id: 'repo-1',
          name: 'Repo 1',
          url: 'https://github.com/org/repo-1',
          analyses: [
            {
              analysisId: 'a1',
              createdAt: '2023-01-01T00:00:00Z',
              status: 'COMPLETED',
              codeReportJson: {
                analysis_report: null // fallback to raw json
              },
              docsReportJson: {
                // docs
              },
              secReportJson: {
                // sec
              }
            }
          ]
        }
      }
    })
    
    const repo = await repositoriesApi.get('repo-1')
    expect(repo.lastAnalysis?.report).toBeDefined()
  })

  it('startAnalysis posts to /analysis with explicit password', async () => {
    mockPost.mockResolvedValueOnce({ data: { id: 'new-id' } })
    await repositoriesApi.startAnalysis('repo', { areas: ['code'], username: 'u', password: 'p' })
    expect(mockPost).toHaveBeenCalledWith('/analysis', expect.objectContaining({ password: 'p' }))
  })

  it('getHistory handles null analyses and missing timestamp properties', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        data: {
          // missing 'analyses' entirely
        }
      }
    })
    const res1 = await repositoriesApi.getHistory('id')
    expect(res1.items).toEqual([])

    mockGet.mockResolvedValueOnce({
      data: {
        data: {
          analyses: [
            {
              analysisId: 'test',
              status: 'COMPLETED',
              // missing timestamp, requested areas, overallScore etc
            }
          ]
        }
      }
    })
    const res2 = await repositoriesApi.getHistory('id')
    expect(res2.items.length).toBe(1)
    expect(res2.items[0].date).toBeDefined()
    expect(res2.items[0].areas).toEqual([]) // filter Boolean drops the falsy values
    expect(res2.items[0].score).toBe(80) // fallback to 80 (from global mock)
    expect(res2.items[0].issuesCount).toBe(0) // fallback to 0

    // Missing page/limit
    const res3 = await repositoriesApi.getHistory('id', {})
    expect(res3.page).toBe(1)
  })

  it('list handles NO-ANALYSIS- fallback when c.analyses is absent and c.name is missing', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        success: true,
        collections: [{ url: '', description: 'desc' }]
      }
    })
    mockGet.mockResolvedValueOnce({
      data: { data: { analyses: [] } }
    })
    const result = await repositoriesApi.list()
    expect(result[0].name).toBe('')
    expect(result[0].lastAnalysis).toBeUndefined()
  })

  it('list uses c.analyses[0] fallback when lastAnalysisItem lacks analysisId', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        success: true,
        collections: [{ url: 'my-url', lastAnalysisDate: '2023-01-01', analyses: ['fallback-1'] }]
      }
    })
    const d = { createdAt: '2023-01-01' }; 
    // mock full details
    mockGet.mockResolvedValueOnce({
      data: { data: { analyses: [d] } }
    })
    const result = await repositoriesApi.list()
    expect(result[0].lastAnalysis?.id).toBe('fallback-1')
  })

  it('list uses NO-ANALYSIS fallback when lastAnalysisItem lacks analysisId and no c.analyses', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        success: true,
        collections: [{ url: 'my-url', lastAnalysisDate: '2023-01-01', analyses: [] }] // Empty
      }
    })
    const d = { createdAt: '2023-01-01' }; 
    // mock full details
    mockGet.mockResolvedValueOnce({
      data: { data: { analyses: [d] } }
    })
    const result = await repositoriesApi.list()
    expect(result[0].lastAnalysis?.id).toBe('NO-ANALYSIS-my-url')
  })

  it('getHistory covers all branch combinations for areas', async () => {
    // all true
    const aTrue = { analysisId: 'h1', status: 'COMPLETED', requestedCode: true, requestedSecurity: true, requestedDocumentation: true }
    mockGet.mockResolvedValueOnce({ data: { data: { analyses: [aTrue] } } })
    const res1 = await repositoriesApi.getHistory('id')
    expect(res1.items[0].areas).toEqual(['code', 'security', 'documentation'])

    // all false
    const aFalse = { analysisId: 'h2', status: 'COMPLETED', requestedCode: false, requestedSecurity: false, requestedDocumentation: false }
    mockGet.mockResolvedValueOnce({ data: { data: { analyses: [aFalse] } } })
    const res2 = await repositoriesApi.getHistory('id')
    expect(res2.items[0].areas).toEqual([])
  })

  it('getRanking covers string score fallback', async () => {
    mockGet
      .mockResolvedValueOnce({ data: { collections: [collectionA] } })
      .mockResolvedValueOnce({ data: { data: { name: 'a', analyses: [{ analysisId: 'a1', status: 'COMPLETED', overallScore: '99' }] } } })
    mockCalc.mockReturnValueOnce({ reportObj: { qualityScore: '99' } }); 
    
    const ranking = await repositoriesApi.getRanking()
    expect(ranking[0].score).toBe(99)
  })

  it('getHistory handles null analysis status fallback', async () => {
      const a = { analysisId: 'h-null', status: null }
      mockGet.mockResolvedValueOnce({ data: { data: { analyses: [a] } } })
      const res = await repositoriesApi.getHistory('id')
      expect(res.items[0].status).toBe('pending')
  })

  it('get falls back to 0 when scores are missing in COMPLETED status', async () => {
    const analysis = { analysisId: 'an-0', status: 'COMPLETED' }
    mockGet.mockResolvedValue({ data: { success: true, data: { name: 'repo', analyses: [analysis] } } })
    const result = await repositoriesApi.get(encodeURIComponent('repo'))
    expect(result.lastAnalysis?.report?.qualityScore).toBe(0)
    expect(result.lastAnalysis?.report?.securityScore).toBe(0)
    expect(result.lastAnalysis?.report?.documentationScore).toBe(0)
  })

  it('get handles missing timestamp properties in lastAnalysis', async () => {
    const analysis = { analysisId: 'an-time', status: 'COMPLETED' }
    mockGet.mockResolvedValue({ data: { success: true, data: { name: 'repo', analyses: [analysis] } } })
    const result = await repositoriesApi.get(encodeURIComponent('repo'))
    expect(result.lastAnalysis?.date).toBeDefined()
  })

  it('update handles missing name from payload and URL', async () => {
    // missing name in payload
    const res1 = await repositoriesApi.update(encodeURIComponent('https://github.com/org/repo'), { description: 'd' })
    expect(res1.name).toBe('repo')

    // missing name in payload and URL has no slash
    const res2 = await repositoriesApi.update('repo-only', {})
    expect(res2.name).toBe('repo-only')
  })

  it('list handles missing name in payload fallback', async () => {
    mockGet
      .mockResolvedValueOnce({ data: { collections: [{ url: 'repo-no-name' }] } })
      .mockResolvedValueOnce({ data: { data: { analyses: [] } } })
    const result = await repositoriesApi.list()
    expect(result[0].name).toBe('repo-no-name')
  })

  it('get handles security issues with and without line location', async () => {
    const analysis = {
      analysisId: 'a-sec',
      status: 'completed',
      secReportJson: {
        trivy: [
            { rule_id: 'R1', severity: 'high', description: 'd1', line: 10 },
            { rule_id: 'R2', severity: 'low', description: 'd2' } // no line
        ]
      }
    }
    mockGet.mockResolvedValue({ data: { success: true, data: { name: 'repo', analyses: [analysis] } } })
    const result = await repositoriesApi.get('repo')
    const issues = result.lastAnalysis?.report?.securityAnalysis?.issues
    expect(issues?.[0].location).toBeDefined()
    expect(issues?.[1].location).toBeUndefined()
  })

  it('get handles missing testCoverage in codeReportJson', async () => {
    const analysis = {
      analysisId: 'a-cov',
      status: 'completed',
      codeReportJson: {
        analysis_report: {
          static_analysis: { issues: [], total: 0 },
          coverage: { overall_line_pct: null } // null coverage
        }
      }
    }
    mockGet.mockResolvedValue({ data: { success: true, data: { name: 'repo', analyses: [analysis] } } })
    const result = await repositoriesApi.get('repo')
    expect(result.lastAnalysis?.report?.codeAnalysis?.testCoverage).toBeNull()
  })

  it('get handles security issue title fallbacks', async () => {
    const analysis = {
        analysisId: 'a-sec-titles',
        status: 'completed',
        secReportJson: {
          trivy: [
              { package_name: 'p1', package_version: 'v1', severity: 'high', description: 'd1' },
              { rule_id: 'R1', severity: 'medium', description: 'd2' },
              { severity: 'low', description: 'd3' } // no package, no rule
          ]
        }
      }
      mockGet.mockResolvedValue({ data: { success: true, data: { name: 'repo', analyses: [analysis] } } })
      const result = await repositoriesApi.get('repo')
      const issues = result.lastAnalysis?.report?.securityAnalysis?.issues
      expect(issues?.[0].title).toBe('Vulnerabilità in p1 (v1)')
      expect(issues?.[1].title).toBe('R1')
      expect(issues?.[2].title).toBe('Security Issue')
  })

  it('list handles all ID fallback branches', async () => {
      // 1. lastAnalysisItem has analysisId
      mockGet.mockResolvedValueOnce({ data: { collections: [{ url: 'u1' }] } })
      mockGet.mockResolvedValueOnce({ data: { data: { analyses: [{ analysisId: 'aid-1', createdAt: '2021-01-01' }] } } })
      const r1 = await repositoriesApi.list()
      expect(r1[0].lastAnalysis?.id).toBe('aid-1')

      // 2. lastAnalysisItem lacks analysisId, use c.analyses[0]
      mockGet.mockResolvedValueOnce({ data: { collections: [{ url: 'u2', analyses: ['ext-id'] }] } })
      mockGet.mockResolvedValueOnce({ data: { data: { analyses: [{ createdAt: '2021-01-01' }] } } }) // no analysisId
      const r2 = await repositoriesApi.list()
      expect(r2[0].lastAnalysis?.id).toBe('ext-id')

      // 3. Neither has it
      mockGet.mockResolvedValueOnce({ data: { collections: [{ url: 'u3' }] } })
      mockGet.mockResolvedValueOnce({ data: { data: { analyses: [{ createdAt: '2021-01-01' }] } } })
      const r3 = await repositoriesApi.list()
      expect(r3[0].lastAnalysis?.id).toBe('NO-ANALYSIS-u3')

      // 4. lastAnalysisItem lacks analysisId, c.analyses is present but empty
      mockGet.mockResolvedValueOnce({ data: { collections: [{ url: 'u4', analyses: [] }] } })
      mockGet.mockResolvedValueOnce({ data: { data: { analyses: [{ createdAt: '2021-01-01' }] } } })
      const r4 = await repositoriesApi.list()
      expect(r4[0].lastAnalysis?.id).toBe('NO-ANALYSIS-u4')
  })

  it('getHistory handles all date fallback branches', async () => {
    // 1. timestamp present
    mockGet.mockResolvedValueOnce({ data: { analyses: [{ analysisId: 'a1', status: 'COMPLETED', timestamp: '2022-01-01' }] } })
    const r1 = await repositoriesApi.getHistory('u1')
    expect(r1.items[0].date).toBe('2022-01-01')

    // 2. timestamp absent, createdAt present
    mockGet.mockResolvedValueOnce({ data: { analyses: [{ analysisId: 'a2', status: 'COMPLETED', createdAt: '2022-02-02' }] } })
    const r2 = await repositoriesApi.getHistory('u2')
    expect(r2.items[0].date).toBe('2022-02-02')

    // 3. both absent
    mockGet.mockResolvedValueOnce({ data: { analyses: [{ analysisId: 'a3', status: 'COMPLETED' }] } })
    const r3 = await repositoriesApi.getHistory('u3')
    expect(r3.items[0].date).toBeDefined()
  })

  it('list handles all name fallback branches', async () => {
    // 1. payload.name present
    mockGet.mockResolvedValueOnce({ data: { collections: [{ url: 'u1' }] } })
    mockGet.mockResolvedValueOnce({ data: { data: { name: 'Payload Name' } } })
    const r1 = await repositoriesApi.list()
    expect(r1[0].name).toBe('Payload Name')

    // 2. payload.name absent, c.name present
    mockGet.mockResolvedValueOnce({ data: { collections: [{ url: 'u2', name: 'Collection Name' }] } })
    mockGet.mockResolvedValueOnce({ data: { data: {} } })
    const r2 = await repositoriesApi.list()
    expect(r2[0].name).toBe('Collection Name')

    // 3. Both absent, use basename
    mockGet.mockResolvedValueOnce({ data: { collections: [{ url: 'https://h.com/repo-base' }] } })
    mockGet.mockResolvedValueOnce({ data: { data: {} } })
    const r3 = await repositoriesApi.list()
    expect(r3[0].name).toBe('repo-base')

    // 4. Both absent, basename fails (extra slash)
    mockGet.mockResolvedValueOnce({ data: { collections: [{ url: 'base' }] } })
    mockGet.mockResolvedValueOnce({ data: { data: {} } })
    const r4 = await repositoriesApi.list()
    expect(r4[0].name).toBe('base')
  })

  it('list handles all date fallback branches', async () => {
      // 1. lastAnalysisItem.timestamp
      mockGet.mockResolvedValueOnce({ data: { collections: [{ url: 'u1' }] } })
      mockGet.mockResolvedValueOnce({ data: { data: { analyses: [{ timestamp: '2021-01-01' }] } } })
      const r1 = await repositoriesApi.list()
      expect(r1[0].lastAnalysis?.date).toBe('2021-01-01')

      // 2. lastAnalysisItem.createdAt
      mockGet.mockResolvedValueOnce({ data: { collections: [{ url: 'u2' }] } })
      mockGet.mockResolvedValueOnce({ data: { data: { analyses: [{ createdAt: '2021-02-02' }] } } })
      const r2 = await repositoriesApi.list()
      expect(r2[0].lastAnalysis?.date).toBe('2021-02-02')

      // 3. collection.lastAnalysisDate
      mockGet.mockResolvedValueOnce({ data: { collections: [{ url: 'u3', lastAnalysisDate: '2021-03-03' }] } })
      mockGet.mockResolvedValueOnce({ data: { data: { analyses: [] } } })
      const r3 = await repositoriesApi.list()
      expect(r3[0].lastAnalysis?.date).toBe('2021-03-03')

      // 4. none
      mockGet.mockResolvedValueOnce({ data: { collections: [{ url: 'u4' }] } })
      mockGet.mockResolvedValueOnce({ data: { data: { analyses: [] } } })
      // Since mine.length is 0 and lastAnalysisDate is missing, hasAnalysis is false.
  })
})
