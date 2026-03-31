import { gateway } from './gateway'
import type { Analysis, PaginatedResponse, ExportFormat, Remediation } from '@/types'

export const analysisApi = {
  getById: async (id: string): Promise<Analysis> => {
    const { data } = await gateway.get(`/analysis/reports/${id}`)
    return data
  },

  getHistory: async (params?: { page?: number; limit?: number; repositoryId?: string }): Promise<PaginatedResponse<Analysis>> => {
    const { data } = await gateway.get('/analysis/history', { params })
    return data
  },

  exportReport: async (id: string, format: ExportFormat): Promise<Blob> => {
    const { data } = await gateway.get(`/analysis/reports/${id}/export`, {
      params: { format },
      responseType: 'blob',
    })
    return data
  },

  updateRemediationDecision: async (
    analysisId: string,
    remediationId: string,
    decision: Remediation['decision'],
  ): Promise<void> => {
    await gateway.patch(`/analysis/reports/${analysisId}/remediations/${remediationId}`, { decision })
  },
}
