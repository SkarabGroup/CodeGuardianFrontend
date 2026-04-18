import { gateway } from './gateway'
import type { Repository, PaginatedResponse, RankedRepository, AnalysisArea, Analysis } from '@/types'

export const repositoriesApi = {
  list: async (_params?: { search?: string; page?: number; limit?: number }): Promise<Repository[]> => {
    // Recuperiamo la history delle analisi e deriviamo la lista di repository
    const { data } = await gateway.get('/repositories/all')
    const raw = data as { success: boolean; analyses?: Array<any> }
    const analyses = raw.analyses || []
    
    // Poi mappiamo le analisi con le collections fetchando magari tutto?
    // In assenza di un "list collections", manteniamo la deduplicazione:
    const repoMap = new Map<string, any>()
    for (const a of analyses) {
      if (!a.repoURL) continue
      if (!repoMap.has(a.repoURL)) {
        repoMap.set(a.repoURL, a)
      } else {
        const existing = repoMap.get(a.repoURL)
        if (new Date(a.createdAt || 0).getTime() > new Date(existing.createdAt || 0).getTime()) {
          repoMap.set(a.repoURL, a)
        }
      }
    }
    
    return Array.from(repoMap.entries()).map(([url, lastA]) => {
      const statusConverted = (lastA.status || 'pending').toLowerCase().replace(/_/g, '-')
      return {
        id: encodeURIComponent(url),
        name: url.split('/').pop() || url,
        url,
        lastAnalysis: {
          id: lastA.analysisId,
          date: lastA.createdAt || new Date().toISOString(),
          status: statusConverted,
          branch: lastA.branch,
          commitHash: lastA.commit,
          report: lastA.fullReport ?? undefined
        }
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
    await gateway.post('/repositories', { name: payload.name, url: payload.url, description: payload.description })
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
    const { data } = await gateway.get('/repositories/all')
    const raw = data as { success: boolean; analyses?: Array<any> }
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
