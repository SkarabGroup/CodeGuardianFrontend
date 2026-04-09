import { gateway } from './gateway'
import type { Repository, PaginatedResponse, RankedRepository, AnalysisArea, Analysis } from '@/types'

export const repositoriesApi = {
  list: async (params?: { search?: string; page?: number; limit?: number }): Promise<Repository[]> => {
    const { data } = await gateway.get('/analysis/repositories', { params })
    return data
  },

  get: async (id: string): Promise<Repository> => {
    const { data } = await gateway.get(`/analysis/repositories/${id}`)
    return data
  },

  create: async (payload: { name: string; url: string; description?: string }): Promise<Repository> => {
    const { data } = await gateway.post('/analysis/repositories', payload)
    return data
  },

  update: async (id: string, payload: Partial<Pick<Repository, 'name' | 'description'>>): Promise<Repository> => {
    const { data } = await gateway.put(`/analysis/repositories/${id}`, payload)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await gateway.delete(`/analysis/repositories/${id}`)
  },

  getRanking: async (): Promise<RankedRepository[]> => {
    const { data } = await gateway.get('/analysis/repositories/ranking')
    return data
  },

  startAnalysis: async (
    id: string,
    payload?: { areas?: AnalysisArea[]; branch?: string; commitHash?: string; repositoryUrl?: string },
  ): Promise<{ analysisId: string }> => {
    // Il backend espone POST /analysis/start con repositoryUrl nel body.
    // Se repositoryUrl non è fornito, fallback al path legacy per compatibilità mock/sviluppo locale.
    if (payload?.repositoryUrl) {
      const { data } = await gateway.post('/analysis/start', {
        repositoryUrl: payload.repositoryUrl,
        branch: payload.branch ?? 'main',
        commitHash: payload.commitHash ?? null,
      })
      return data
    }
    const { data } = await gateway.post(`/analysis/repositories/${id}/analyze`, {
      areas: payload?.areas,
      branch: payload?.branch ?? 'main',
      commitHash: payload?.commitHash ?? null,
    })
    return data
  },

  getAnalysis: async (id: string): Promise<Analysis> => {
    const { data } = await gateway.get(`/analysis/reports/${id}`)
    return data
  },

  getHistory: async (id: string, params?: { page?: number; limit?: number }): Promise<PaginatedResponse<import('@/types').Analysis>> => {
    const { data } = await gateway.get(`/analysis/repositories/${id}/history`, { params })
    return data
  },

  compareAnalyses: async (id: string, analysisIds: [string, string]): Promise<unknown> => {
    const { data } = await gateway.get(`/analysis/repositories/${id}/compare`, {
      params: { a: analysisIds[0], b: analysisIds[1] },
    })
    return data
  },
}
