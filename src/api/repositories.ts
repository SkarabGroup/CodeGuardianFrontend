import { gateway } from './gateway'
import type { Repository, PaginatedResponse, RankedRepository, AnalysisArea, Analysis } from '@/types'

export const repositoriesApi = {
  list: async (_params?: { search?: string; page?: number; limit?: number }): Promise<Repository[]> => {
    // Il nuovo backend non ha più un gestore repository esplicito, recuperiamo la lista unica dalle analisi
    const { data } = await gateway.get('/analysis/all')
    const raw = data as { success: boolean; analyses?: Array<any> }
    const analyses = raw.analyses || []
    
    const repoMap = new Map<string, any>()
    for (const a of analyses) {
      if (!a.repoURL) continue
      if (!repoMap.has(a.repoURL)) {
        repoMap.set(a.repoURL, a)
      } else {
        const existing = repoMap.get(a.repoURL)
        // Manteniamo la last analysis
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
    // Id è il repoURL encodato o stringa dummy
    const url = decodeURIComponent(id)
    const repo: Repository = { id, name: url.split('/').pop() || url, url }
    
    // Agganciamo la lastAnalysis (con fullReport) per la vista
    try {
      const { data: allData } = await gateway.get('/analysis/all')
      const analyses = (allData as any).analyses || []
      const mine = analyses.filter((a: any) => a.repoURL === url).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      
      if (mine.length > 0) {
        const lastId = mine[0].analysisId
        const { data: full } = await gateway.get('/analysis/one', { data: { analysisId: lastId } })
        const rawFull = full as any
        
        repo.lastAnalysis = {
           id: lastId,
           date: mine[0].createdAt || new Date().toISOString(),
           status: mine[0].status || 'pending',
           branch: mine[0].branch,
           commitHash: mine[0].commit,
           report: rawFull.fullReport ?? undefined
        }
      }
    } catch(e) {}
    return repo
  },

  create: async (payload: { name: string; url: string; description?: string }): Promise<Repository> => {
    return { id: encodeURIComponent(payload.url), name: payload.name, url: payload.url, description: payload.description }
  },

  update: async (id: string, payload: Partial<Pick<Repository, 'name' | 'description'>>): Promise<Repository> => {
    const url = decodeURIComponent(id)
    return { id, name: payload.name ?? (url.split('/').pop() || url), url, description: payload.description }
  },

  delete: async (_id: string): Promise<void> => {
    return Promise.resolve()
  },

  getRanking: async (): Promise<RankedRepository[]> => {
    return []
  },

  startAnalysis: async (
    _id: string,
    payload?: { areas?: AnalysisArea[]; branch?: string; commitHash?: string; repositoryUrl?: string },
  ): Promise<{ analysisId: string }> => {
    const areas = payload?.areas ?? ['code', 'security', 'documentation']
    const { data } = await gateway.post('/analysis/start', {
      repoUrl: payload?.repositoryUrl,
      branch: payload?.branch ?? 'main',
      commit: payload?.commitHash ?? undefined,
      requestedCode: areas.includes('code'),
      requestedSecurity: areas.includes('security'),
      requestedDocumentation: areas.includes('documentation'),
    })
    return { analysisId: (data as { id?: string }).id ?? '' }
  },

  getHistory: async (id: string, params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Analysis>> => {
    // Simuliamo la history filtrando fetchando tutti
    const url = decodeURIComponent(id)
    const { data } = await gateway.get('/analysis/all')
    const raw = data as { success: boolean; analyses?: Array<any> }
    const items = (raw.analyses || []).filter(a => a.repoURL === url).map(a => ({
      id: a.analysisId,
      status: a.status,
      issuesCount: a.totalIssues || 0,
      score: a.overallScore || 0,
      startedAt: a.timestamp || new Date().toISOString(),
      date: a.timestamp || new Date().toISOString(), // Fallback per Type match
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
