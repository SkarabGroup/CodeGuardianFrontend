import jsPDF from 'jspdf';
import { calculateScores } from './calculateScores'
import { gateway } from './gateway'
import type { Analysis, AnalysisStatus, DocsAnalysisReport, PaginatedResponse, ExportFormat, Remediation } from '@/types'

export const analysisApi = {
  getById: async (id: string): Promise<Analysis> => {
    const { data } = await gateway.get(`/repositories/analysis/${id}`)
    const raw = data as {
      success: boolean
      analysisId?: string
      branch?: string
      commit?: string
      status?: string
      createdAt?: string
      docsReportJson?: DocsAnalysisReport | null
      fullReport?: any
      overallScore?: number
      securityScore?: number
      docsScore?: number
    }
    return {
      id: raw.analysisId ?? id,
      date: raw.createdAt ?? new Date().toISOString(),
      status: (raw.status ?? 'pending') as AnalysisStatus,
      branch: raw.branch,
      commitHash: raw.commit,
      executionMetrics: (raw as any).executionMetrics,
      report: raw.fullReport ? raw.fullReport : (raw.docsReportJson ? {
        qualityScore: raw.overallScore || 0,
        securityScore: raw.securityScore || 0,
        documentationScore: raw.docsScore || 0,
        criticalIssues: 0,
        warningIssues: 0,
        infoIssues: 0,
        remediations: [],
        documentationAnalysis: { issues: [], report: raw.docsReportJson },
      } : undefined),
    }
  },

  getHistory: async (_params?: { page?: number; limit?: number; repositoryId?: string }): Promise<PaginatedResponse<Analysis>> => {
    try {
      const collectionsRes = await gateway.get('/repositories/all-collections').catch(() => ({ data: { collections: [] } }))
      const rawCollections = collectionsRes.data as { collections?: Array<{ url: string; name: string }> }
      const collections = rawCollections.collections || []

      const fullDetailsPromises = collections.map(c => 
        gateway.get(`/repositories/full-details/${encodeURIComponent(c.url)}`)
          .catch(() => ({ data: { data: { analyses: [] } } }))
      )
      const fullDetailsResponses = await Promise.all(fullDetailsPromises)
      
      let allAnalyses: any[] = []
      fullDetailsResponses.forEach((res, i) => {
         const payload = res.data?.data || res.data || { analyses: [] }
         const analyses = payload.analyses || []
         allAnalyses = allAnalyses.concat(analyses.map((a: any) => ({
           ...a, 
           repositoryId: encodeURIComponent(collections[i].url), 
           repoName: collections[i].url.split('/').pop()?.replace('.git', '') || 'Sconosciuto'
         })))
      })
      allAnalyses.sort((a,b) => new Date(b.createdAt || b.timestamp).getTime() - new Date(a.createdAt || a.timestamp).getTime())

      const items: Analysis[] = allAnalyses.map((item: any) => {
        const { reportObj, extMetrics } = calculateScores(item)
        return {
          id: item.analysisId,
          repositoryId: item.repositoryId,
          repositoryName: item.repoName,
          date: item.createdAt || item.timestamp || new Date().toISOString(),
          status: (item.status ?? 'pending') as AnalysisStatus,
          branch: item.branch,
          commitHash: item.commit,
          report: reportObj,
          executionMetrics: extMetrics,
        }
      })
      return { items, total: items.length, page: 1, limit: items.length, totalPages: 1 }
    } catch(e) {
      console.error('[getHistory Error]', e)
      return { items: [], total: 0, page: 1, limit: 10, totalPages: 1 }
    }
  },

  exportReport: async (id: string, format: ExportFormat): Promise<Blob> => {
    // Generate export on frontend side instead of relying on the backend endpoint
    const analysis = await analysisApi.getById(id);
    
    if (format === 'json') {
      const jsonStr = JSON.stringify(analysis, null, 2);
      return new Blob([jsonStr], { type: 'application/json' });
    }
    
    if (format === 'pdf') {
      const doc = new jsPDF() as any;
      
      // We will just render the raw JSON into the PDF elegantly to ensure all numbers and structures are exact.
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.text('CodeGuardian Automatic Raw Export', 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      
      // Use splitTextToSize to wrap the JSON nicely inside the page boundaries
      const jsonStr = JSON.stringify(analysis, null, 2);
      const splitText = doc.splitTextToSize(jsonStr, 180);
      
      let y = 30;
      const pageHeight = doc.internal.pageSize.height;
      
      for (let i = 0; i < splitText.length; i++) {
        if (y > pageHeight - 15) {
          doc.addPage();
          y = 20;
        }
        doc.text(splitText[i], 14, y);
        y += 5; // line height
      }
      
      return doc.output('blob');
    }
    
    throw new Error('Unsupported export format: ' + format);
  },

  updateRemediationDecision: async (
    analysisId: string,
    remediationId: string,
    decision: Remediation['decision'],
  ): Promise<void> => {
    await gateway.patch(`/analysis/reports/${analysisId}/remediations/${remediationId}`, { decision })
  },
}
