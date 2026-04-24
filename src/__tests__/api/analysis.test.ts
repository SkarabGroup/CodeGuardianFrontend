import { describe, it, expect, vi, beforeEach } from 'vitest'
import { analysisApi } from '@/api/analysis'

const mockGet   = vi.hoisted(() => vi.fn())
const mockPatch = vi.hoisted(() => vi.fn())
const mockCalc  = vi.hoisted(() => vi.fn())

vi.mock('@/api/gateway', () => ({
  gateway: { get: mockGet, patch: mockPatch },
  tokenStorage: { getAccess: vi.fn(), getRefresh: vi.fn(), setAccess: vi.fn(), setRefresh: vi.fn(), clear: vi.fn() },
}))

vi.mock('@/api/calculateScores', () => ({
  calculateScores: mockCalc,
}))

vi.mock('jspdf', () => {
  const mockDoc = {
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    text: vi.fn(),
    splitTextToSize: vi.fn().mockReturnValue(['line1', 'line2']),
    addPage: vi.fn(),
    output: vi.fn().mockReturnValue(new Blob(['pdf'], { type: 'application/pdf' })),
    internal: { pageSize: { height: 297 } },
  }
  return { default: vi.fn().mockImplementation(() => mockDoc) }
})

const rawAnalysis = {
  success: true,
  analysisId: 'a-1',
  createdAt: '2025-01-01T00:00:00.000Z',
  status: 'completed',
  branch: 'main',
  commit: 'abc123',
  fullReport: {
    qualityScore: 80,
    securityScore: 70,
    documentationScore: 90,
    criticalIssues: 0,
    warningIssues: 1,
    infoIssues: 2,
    remediations: [],
  },
}

describe('analysisApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockCalc.mockReturnValue({ reportObj: { qualityScore: 80, remediations: [] }, extMetrics: {} })
  })

  // getById
  it('getById maps fullReport correctly', async () => {
    mockGet.mockResolvedValue({ data: rawAnalysis })
    const result = await analysisApi.getById('a-1')
    expect(result.id).toBe('a-1')
    expect(result.status).toBe('completed')
    expect(result.report?.qualityScore).toBe(80)
  })

  it('getById falls back to analysisId from raw when present', async () => {
    mockGet.mockResolvedValue({ data: { ...rawAnalysis, analysisId: 'from-raw' } })
    const result = await analysisApi.getById('a-1')
    expect(result.id).toBe('from-raw')
  })

  it('getById builds report from docsReportJson when fullReport absent', async () => {
    mockGet.mockResolvedValue({
      data: {
        success: true,
        analysisId: 'a-2',
        status: 'completed',
        docsReportJson: { issues: [] },
        overallScore: 75,
        securityScore: 60,
        docsScore: 85,
      },
    })
    const result = await analysisApi.getById('a-2')
    expect(result.report?.qualityScore).toBe(75)
    expect(result.report?.documentationScore).toBe(85)
  })

  it('getById returns undefined report when no fullReport and no docsReportJson', async () => {
    mockGet.mockResolvedValue({ data: { success: true, analysisId: 'a-3', status: 'pending' } })
    const result = await analysisApi.getById('a-3')
    expect(result.report).toBeUndefined()
  })

  it('getById uses argument id when analysisId absent from raw', async () => {
    mockGet.mockResolvedValue({ data: { success: true, status: 'completed' } })
    const result = await analysisApi.getById('fallback-id')
    expect(result.id).toBe('fallback-id')
  })

  it('getById defaults date to now when createdAt is absent', async () => {
    const before = Date.now()
    mockGet.mockResolvedValue({ data: { success: true, analysisId: 'a-4', status: 'pending' } })
    const result = await analysisApi.getById('a-4')
    const after = Date.now()
    const resultTime = new Date(result.date).getTime()
    expect(resultTime).toBeGreaterThanOrEqual(before)
    expect(resultTime).toBeLessThanOrEqual(after)
  })

  it('getById uses 0 when docsReportJson scores are missing', async () => {
    mockGet.mockResolvedValue({
      data: {
        success: true,
        analysisId: 'a-5',
        status: 'completed',
        docsReportJson: { issues: [] },
        // no overallScore, securityScore, docsScore
      },
    })
    const result = await analysisApi.getById('a-5')
    expect(result.report?.qualityScore).toBe(0)
    expect(result.report?.securityScore).toBe(0)
    expect(result.report?.documentationScore).toBe(0)
  })

  // getHistory
  it('getHistory returns empty items when collections fetch fails', async () => {
    mockGet.mockRejectedValue(new Error('network'))
    const result = await analysisApi.getHistory()
    expect(result.items).toEqual([])
    expect(result.totalPages).toBe(1)
  })

  it('getHistory returns empty when no collections', async () => {
    mockGet.mockResolvedValue({ data: { collections: [] } })
    const result = await analysisApi.getHistory()
    expect(result.items).toEqual([])
  })

  it('getHistory maps analyses from full-details', async () => {
    mockGet
      .mockResolvedValueOnce({ data: { collections: [{ url: 'https://github.com/org/repo', name: 'repo' }] } })
      .mockResolvedValueOnce({ data: { data: { analyses: [{ analysisId: 'h1', status: 'COMPLETED', createdAt: '2025-01-01T00:00:00.000Z' }] } } })
    const result = await analysisApi.getHistory()
    expect(result.items).toHaveLength(1)
    expect(result.items[0].id).toBe('h1')
  })

  it('getHistory uses timestamp when createdAt is absent from analysis item', async () => {
    mockGet
      .mockResolvedValueOnce({ data: { collections: [{ url: 'https://github.com/org/repo', name: 'repo' }] } })
      .mockResolvedValueOnce({ data: { data: { analyses: [{ analysisId: 'ts-1', timestamp: '2025-06-01T00:00:00.000Z' }] } } })
    const result = await analysisApi.getHistory()
    expect(result.items[0].date).toBe('2025-06-01T00:00:00.000Z')
  })

  it('getHistory handles full-details failure gracefully', async () => {
    mockGet
      .mockResolvedValueOnce({ data: { collections: [{ url: 'https://github.com/org/repo', name: 'repo' }] } })
      .mockRejectedValueOnce(new Error('fail'))
    const result = await analysisApi.getHistory()
    expect(result.items).toEqual([])
  })

  it('getHistory catches unexpected errors and returns empty', async () => {
    mockGet
      .mockResolvedValueOnce({ data: { collections: [{ url: 'https://github.com/org/repo', name: 'repo' }] } })
      .mockResolvedValueOnce({ data: { data: { analyses: [{ analysisId: 'x', status: 'COMPLETED', createdAt: '2025-01-01T00:00:00.000Z' }] } } })
    mockCalc.mockImplementationOnce(() => { throw new Error('unexpected score failure') })
    const result = await analysisApi.getHistory()
    expect(result.items).toEqual([])
    expect(result.total).toBe(0)
  })

  // exportReport — json
  it('exportReport returns JSON blob for json format', async () => {
    mockGet.mockResolvedValue({ data: rawAnalysis })
    const blob = await analysisApi.exportReport('a-1', 'json')
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('application/json')
  })

  // exportReport — pdf
  it('exportReport returns PDF blob for pdf format', async () => {
    mockGet.mockResolvedValue({ data: rawAnalysis })
    const blob = await analysisApi.exportReport('a-1', 'pdf')
    expect(blob).toBeInstanceOf(Blob)
  })

  // exportReport — pdf with page overflow
  it('exportReport triggers addPage when content exceeds page height', async () => {
    const { default: JsPDF } = await import('jspdf')
    const mockDoc = (JsPDF as any)()
    // Returning 60 lines forces y to exceed pageHeight-15 (297-15=282) triggering addPage
    mockDoc.splitTextToSize.mockReturnValueOnce(Array.from({ length: 60 }, (_, i) => `line ${i}`))
    mockGet.mockResolvedValue({ data: rawAnalysis })
    await analysisApi.exportReport('a-1', 'pdf')
    expect(mockDoc.addPage).toHaveBeenCalled()
  })

  // exportReport — unknown format
  it('exportReport throws for unsupported format', async () => {
    mockGet.mockResolvedValue({ data: rawAnalysis })
    await expect(analysisApi.exportReport('a-1', 'csv' as any)).rejects.toThrow('Unsupported export format')
  })

  // updateRemediationDecision
  it('updateRemediationDecision sends PATCH to correct URL', async () => {
    mockPatch.mockResolvedValue({})
    await analysisApi.updateRemediationDecision('a-1', 'rem-1', 'accepted')
    expect(mockPatch).toHaveBeenCalledWith('/analysis/reports/a-1/remediations/rem-1', { decision: 'accepted' })
  })

  it('getById missing raw properties', async () => {
    mockGet.mockResolvedValue({ 
      data: {
        data: {
          // missing createdAt, status, analysisId
          branch: "b1",
          commit: "c1"
        }
      }
    })
    const res = await analysisApi.getById('123')
    expect(res.id).toBe('123')
    expect(res.status).toBe('pending')
    expect(res.date).toBeDefined()
  })

  it('getHistory handles missing collections array', async () => {
    mockGet.mockResolvedValueOnce({
      data: { collections: null } 
    })
    const res = await analysisApi.getHistory()
    expect(res.items.length).toBe(0)
  })

  it('getHistory handles full-details errors and missing payload/analyses', async () => {
    mockGet.mockResolvedValueOnce({
      data: { collections: [ { url: 'owner/repo1' }, { url: 'owner/repo2' }, { url: 'https://github.com/no-git' }, { url: '' } ] }
    })

    // repo1 fails
    mockGet.mockRejectedValueOnce(new Error('network error'))
    
    // repo2 returns payload without analyses
    mockGet.mockResolvedValueOnce({ data: {} }) // `res.data` is `{}` so `res.data.data` is undefined, `res.data` truthy but no `analyses`, handled.
    
    // no-git returns 1 analysis with missing timestamp/createdAt
    mockGet.mockResolvedValueOnce({
      data: {
        data: {
          analyses: [
            { analysisId: 'a1', branch: 'main' } // missing timestamps
          ]
        }
      }
    })

    // empty URL returns falsy data for payload fallback testing
    mockGet.mockResolvedValueOnce({ data: null }) // `res.data` is null -> falls back to `{ analyses: [] }` but we'll include an analysis directly if possible? Wait, if it falls back to `{ analyses: [] }`, we won't see it in items to test `repoName`. Let's mock a payload that gives `analyses: [{analysisId: 'a2'}]` but the collection has `url: ''`.
    
    const res = await analysisApi.getHistory()
    // It should have 1 item from no-git. (wait, if url is '', the 4th call gives data: null => analyses = []). Thus items.length = 1.
    expect(res.items.length).toBe(1)
    expect(res.items[0].repositoryName).toBe('no-git')
    expect(res.items[0].date).toBeDefined()
  })

  it('getHistory handles empty url resulting in Sconosciuto and null payload resulting in default object', async () => {
    mockGet.mockResolvedValueOnce({
      data: { collections: [ { url: '' } ] }
    })
    
    // Mock the axios response to have undefined/null data
    // But then analyses will be empty, so no items produced.
    // Instead to test `{ analyses: [] }` fallback we just ensure no error is thrown when data is completely falsey. 
    mockGet.mockResolvedValueOnce({ data: null })

    const res = await analysisApi.getHistory()
    expect(res.items.length).toBe(0)
  })

  it('getHistory hits Sconosciuto branch when URL is empty but analyses are present', async () => {
    mockGet.mockResolvedValueOnce({
      data: { collections: [ { url: '' } ] }
    })
    mockGet.mockResolvedValueOnce({
      data: { data: { analyses: [{ analysisId: 'empty-url-id' }] } }
    })

    const res = await analysisApi.getHistory()
    expect(res.items.length).toBe(1)
    expect(res.items[0].repositoryName).toBe('Sconosciuto')
  })
})
