import { gateway } from './gateway'
import type { Analysis, AnalysisStatus, DocsAnalysisReport, PaginatedResponse, ExportFormat, Remediation } from '@/types'

export const analysisApi = {
  getById: async (id: string): Promise<Analysis> => {
    const { data } = await gateway.get('/analysis/one', { data: { analysisId: id } })
    const raw = data as {
      success: boolean
      analysisId?: string
      branch?: string
      commit?: string
      status?: string
      createdAt?: string
      docsReportJson?: DocsAnalysisReport | null
    }
    return {
      id: raw.analysisId ?? id,
      date: raw.createdAt ?? new Date().toISOString(),
      status: (raw.status ?? 'pending') as AnalysisStatus,
      branch: raw.branch,
      commitHash: raw.commit,
      report: raw.docsReportJson ? {
        qualityScore: 0,
        securityScore: 0,
        criticalIssues: 0,
        warningIssues: 0,
        infoIssues: 0,
        remediations: [],
        documentationAnalysis: { issues: [], report: raw.docsReportJson },
      } : undefined,
    }
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
