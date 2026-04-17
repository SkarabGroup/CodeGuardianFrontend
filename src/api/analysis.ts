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
      fullReport?: any // Utilizzato in modalità mock per passare tutto
    }
    return {
      id: raw.analysisId ?? id,
      date: raw.createdAt ?? new Date().toISOString(),
      status: (raw.status ?? 'pending') as AnalysisStatus,
      branch: raw.branch,
      commitHash: raw.commit,
      report: raw.fullReport ? raw.fullReport : (raw.docsReportJson ? {
        qualityScore: 0,
        securityScore: 0,
        criticalIssues: 0,
        warningIssues: 0,
        infoIssues: 0,
        remediations: [],
        documentationAnalysis: { issues: [], report: raw.docsReportJson },
      } : undefined),
    }
  },

  getHistory: async (_params?: { page?: number; limit?: number; repositoryId?: string }): Promise<PaginatedResponse<Analysis>> => {
    const { data } = await gateway.get('/analysis/all')
    const raw = data as {
      success: boolean
      analyses?: Array<any>
    }
    const items: Analysis[] = (raw.analyses ?? []).map(item => ({
      id: item.analysisId,
      date: item.createdAt ?? new Date().toISOString(),
      status: (item.status ?? 'pending') as AnalysisStatus,
      branch: item.branch,
      commitHash: item.commit,
      report: item.fullReport ?? undefined
    }))
    return { items, total: items.length, page: 1, limit: items.length, totalPages: 1 }
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
