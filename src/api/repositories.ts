import { gateway } from './gateway'
import type { Repository, PaginatedResponse, RankedRepository, AnalysisArea, Analysis, AnalysisStatus } from '@/types'

export const repositoriesApi = {
  list: async (_params?: { search?: string; page?: number; limit?: number }): Promise<Repository[]> => {
    const collectionsRes = await gateway.get('/repositories/all-collections')
    const rawCollections = collectionsRes.data as { success: boolean; collections?: Array<{ url: string; name: string; description?: string; lastAnalysisDate?: string; analyses?: string[] }> }
    const collections = rawCollections.collections || []

    return collections.map((c) => {
      const hasAnalysis = c.analyses && c.analyses.length > 0
      const lastAnalysisId = hasAnalysis ? c.analyses![0] : `NO-ANALYSIS-${c.url}`

      return {
        id: encodeURIComponent(c.url),
        name: c.name || (c.url.split('/').pop() || c.url),
        description: c.description,
        url: c.url,
        lastAnalysis: hasAnalysis ? {
           id: lastAnalysisId,
           date: c.lastAnalysisDate || new Date().toISOString(),
           status: 'completed',
        } : undefined
      }
    })
  },

  get: async (id: string): Promise<Repository> => {
    const url = decodeURIComponent(id)
    const repo: Repository = { id, name: url.split('/').pop() || url, url }
    
    try {
      // Usiamo il nuovo endpoint per i full details!
      const { data } = await gateway.get(`/repositories/full-details/${encodeURIComponent(url)}`)
      if (data.success) {
        repo.name = data.name
        repo.description = data.description
        const analyses = data.analyses || []
        const mine = analyses.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        if (mine.length > 0) {
          const rawFull = mine[0]
          repo.lastAnalysis = {
             id: rawFull.analysisId,
             date: rawFull.createdAt || new Date().toISOString(),
             status: rawFull.status || 'pending',
             branch: rawFull.branch,
             commitHash: rawFull.commit,
             report: rawFull.fullReport ?? undefined
          }
        }
      }
    } catch(e) {}
    return repo
  },

  create: async (payload: { name: string; url: string; description?: string }): Promise<Repository> => {
    const { data } = await gateway.post('/repositories', { name: payload.name, url: payload.url, description: payload.description })
    if (data && data.success === false) {
      throw new Error(data.message || 'Errore durante la creazione del repository')
    }
    return { id: encodeURIComponent(payload.url), name: payload.name, url: payload.url, description: payload.description }
  },

  update: async (id: string, payload: Partial<Pick<Repository, 'name' | 'description'>>): Promise<Repository> => {
    const url = decodeURIComponent(id)
    return { id, name: payload.name ?? (url.split('/').pop() || url), url, description: payload.description }
  },

  delete: async (id: string): Promise<void> => {
    const url = decodeURIComponent(id)
    await gateway.delete(`/repositories/${encodeURIComponent(url)}`)
  },

  getRanking: async (): Promise<RankedRepository[]> => {
    return []
  },

  startAnalysis: async (
    _id: string,
    payload?: { areas?: AnalysisArea[]; branch?: string; commitHash?: string; repositoryUrl?: string },
  ): Promise<{ analysisId: string }> => {
    const areas = payload?.areas ?? ['code', 'security', 'documentation']
    const { data } = await gateway.post('/analysis', {
      repoUrl: payload?.repositoryUrl ?? decodeURIComponent(_id),
      branch: payload?.branch ?? 'main',
      commit: payload?.commitHash ?? undefined,
      requestedCode: areas.includes('code'),
      requestedSecurity: areas.includes('security'),
      requestedDocumentation: areas.includes('documentation'),
    })
    return { analysisId: (data as { id?: string }).id ?? '' }
  },

  getHistory: async (id: string, params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Analysis>> => {
    const url = decodeURIComponent(id)
    const { data } = await gateway.get('/repositories/all-analyses')
    const raw = data as { analyses?: Array<any> }
    const items = (raw.analyses || []).filter(a => a.repoURL === url).map(a => ({
      id: a.analysisId,
      status: a.status,
      issuesCount: a.totalIssues || 0,
      score: a.overallScore || 0,
      startedAt: a.timestamp || new Date().toISOString(),
      date: a.timestamp || new Date().toISOString(),
      areas: [a.requestedCode && 'code', a.requestedSecurity && 'security', a.requestedDocumentation && 'documentation'].filter(Boolean),
      branch: a.branch,
      commitHash: a.commit,
      report: a.fullReport ?? undefined
    }))
    
    return {
      items,
      total: items.length,
      page: params?.page ?? 1,
      limit: params?.limit ?? 10,
      totalPages: 1
    }
  },

  compareAnalyses: async (_id: string, _analysisIds: [string, string]): Promise<unknown> => {
    return {}
  },
}
