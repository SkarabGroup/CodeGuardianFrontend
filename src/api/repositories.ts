import { gateway } from './gateway'
import type { Repository, PaginatedResponse, RankedRepository, AnalysisArea, Analysis, AnalysisStatus } from '@/types'

import { calculateScores } from './calculateScores'

const mapStatus = (status?: string): AnalysisStatus => {
  const s = (status || 'pending').toLowerCase()
  if (s === 'queued') return 'pending'
  if (s === 'in_progress') return 'in-progress'
  if (s === 'failed' || s === 'completed' || s === 'not-analyzed' || s === 'in-progress') return s as AnalysisStatus
  return 'pending'
}

export const repositoriesApi = {
  list: async (_params?: { search?: string; page?: number; limit?: number }): Promise<Repository[]> => {
    // Carica collezioni 
    const collectionsRes = await gateway.get('/repositories/all-collections').catch(() => ({ data: { collections: [] } }))
    const rawCollections = collectionsRes.data as { success: boolean; collections?: Array<{ url: string; name: string; description?: string; lastAnalysisDate?: string; analyses?: string[] }> }
    const collections = rawCollections.collections || []

    // Carica i full dettagli per ogni collezione trovata
    const fullDetailsPromises = collections.map(c => 
      gateway.get(`/repositories/full-details/${encodeURIComponent(c.url)}`)
        .catch(() => ({ data: { data: { analyses: [] } } }))
    )
    const fullDetailsResponses = await Promise.all(fullDetailsPromises)

    return collections.map((c, index) => {
      const payload = fullDetailsResponses[index].data?.data || fullDetailsResponses[index].data || { analyses: [] }
      const analyses = payload.analyses || []
      
      const mine = analyses.sort((a: any, b: any) => new Date(b.createdAt || b.timestamp).getTime() - new Date(a.createdAt || a.timestamp).getTime())
      const lastAnalysisItem = mine.length > 0 ? mine[0] : null
      const currentStatus = mapStatus(lastAnalysisItem?.status || 'not-analyzed')

      let reportObj, extMetrics
      if (lastAnalysisItem) {
          const scores = calculateScores(lastAnalysisItem)
          reportObj = scores.reportObj
          extMetrics = scores.extMetrics
      }

      const hasAnalysis = mine.length > 0 || !!c.lastAnalysisDate

      return {
        id: encodeURIComponent(c.url),
        name: payload.name || c.name || (c.url.split('/').pop() || c.url),
        description: payload.description || c.description,
        url: c.url,
        lastAnalysis: hasAnalysis ? {
           id: lastAnalysisItem?.analysisId || (c.analyses && c.analyses.length > 0 ? c.analyses![0] : `NO-ANALYSIS-${c.url}`),
           date: lastAnalysisItem?.timestamp || lastAnalysisItem?.createdAt || c.lastAnalysisDate || new Date().toISOString(),
           status: currentStatus,
           report: reportObj,
           executionMetrics: extMetrics
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
        const payload = data.data || data // Gestisce sia il mock (root) che il backend (sotto data.data)
        repo.name = payload.name || repo.name
        repo.description = payload.description
        const analyses = payload.analyses || []
        
        console.log('[DEBUG] full-details analyses =>', analyses.length)
        
        const mine = analyses.sort((a: any, b: any) => new Date(b.createdAt || b.timestamp).getTime() - new Date(a.createdAt || a.timestamp).getTime())
        if (mine.length > 0) {
          // Check if analysisId is requested in the URL
          const urlParams = new URLSearchParams(window.location.search);
          const requestedAnalysisId = urlParams.get('analysisId');
          const rawFull = requestedAnalysisId 
             ? (mine.find((a: any) => a.analysisId === requestedAnalysisId) || mine[0]) 
             : mine[0];
          
          let reportObj = rawFull.fullReport ?? undefined
          
          // Costruisce report anche se il DB ha codeReportJson/docsReportJson ma non un `fullReport` pre-assemblato
          if (!reportObj && (rawFull.codeReportJson || rawFull.docsReportJson)) {
             
             const codeRep = rawFull.codeReportJson?.analysis_report || rawFull.codeReportJson;
             const docsRep = rawFull.docsReportJson?.analysis_report || rawFull.docsReportJson;
             
             // Mapping issues del codice
             let mappedCodeIssues = (codeRep?.static_analysis?.issues || []).map((iss: any) => ({
                 id: Math.random().toString(36).substr(2, 9),
                 title: iss.rule || iss.category || 'Problema codice',
                 description: iss.description,
                 severity: (iss.severity?.toLowerCase() === 'error' || iss.severity?.toLowerCase() === 'high' ? 'critical' : iss.severity?.toLowerCase() === 'warning' ? 'warning' : 'info'),
                 category: iss.category || 'CODE',
                 file: iss.file,
                 location: iss.location,
                 suggested_fix: iss.suggested_fix,
                 url: iss.url
             }));

             // Se static_analysis manca ma abbiamo il ragionamento dell'AI, usiamo quello come fallback per popolare la lista!
             if (mappedCodeIssues.length === 0 && codeRep?.ai_interpretation?.static_analysis_evaluation?.key_issues_reasoning) {
                 mappedCodeIssues = codeRep.ai_interpretation.static_analysis_evaluation.key_issues_reasoning.map((ki: any) => ({
                    id: Math.random().toString(36).substr(2, 9),
                    title: ki.rule || 'AI Analysis Finding',
                    description: ki.original_description || 'Problema rilevato da AI',
                    severity: (ki.severity?.toLowerCase() === 'high' || ki.severity?.toLowerCase() === 'critical' ? 'critical' : ki.severity?.toLowerCase() === 'medium' ? 'warning' : 'info'),
                    category: 'AI_REASONING',
                    file: ki.file,
                    location: ki.location,
                    suggested_fix: ki.suggested_resolution || ki.ai_reasoning
                 }));
             }
             
             let linesAnalyzed = codeRep?.static_analysis?.total || undefined;

             // Mapping issues documentazione
             const mappedDocsIssues: any[] = [];
             if (docsRep) {
                if (docsRep.API_standard_violations) {
                    docsRep.API_standard_violations.forEach((v: any) => mappedDocsIssues.push({
                        title: v.rule || 'Violazione API',
                        description: v.message,
                        severity: (v.severity?.toLowerCase() === 'error' ? 'critical' : 'warning'),
                        file: v.file,
                        category: 'API_VIOLATION'
                    }));
                }
                if (docsRep.docs_discrepancies) {
                    docsRep.docs_discrepancies.forEach((d: any) => mappedDocsIssues.push({
                        title: d.docs_claim || 'Discrepanza documentazione',
                        description: d.actual_finding,
                        severity: 'warning',
                        category: d.category || 'DISCREPANCY'
                    }));
                }
                if (docsRep.missing_files) {
                    docsRep.missing_files.forEach((m: any) => mappedDocsIssues.push({
                        title: 'File mancante: ' + m.referenced_path,
                        description: `Mancante in ${m.referenced_in}. Contesto: ${m.context}`,
                        severity: 'info',
                        category: 'MISSING_FILE'
                    }));
                }
             }

             // TODO: Eventuali score mockati finchè il backend non unisce un `fullReport` completo
             reportObj = {
               qualityScore: codeRep ? (
    codeRep.ai_interpretation?.verdict === 'POOR' ? Math.max(0, 40 - mappedCodeIssues.length) :
    codeRep.ai_interpretation?.verdict === 'FAIR' ? Math.max(40, 70 - mappedCodeIssues.length) :
    Math.max(0, 100 - mappedCodeIssues.length * 2)
  ) : 0,
               securityScore: undefined, // TODO: da mappare quando ci sarà il security report, per ora placeholder non rompe nulla
               documentationScore: docsRep ? Math.max(0, 100 - mappedDocsIssues.length * 5) : undefined,
               criticalIssues: mappedCodeIssues.filter((i: any) => i.severity === 'critical').length + mappedDocsIssues.filter((i: any) => i.severity === 'critical').length,
               warningIssues: mappedCodeIssues.filter((i: any) => i.severity === 'warning').length + mappedDocsIssues.filter((i: any) => i.severity === 'warning').length,
               infoIssues: mappedCodeIssues.filter((i: any) => i.severity === 'info').length + mappedDocsIssues.filter((i: any) => i.severity === 'info').length,
               remediations: [],
               codeAnalysis: codeRep ? {
                  issues: mappedCodeIssues,
                  coverage: codeRep.coverage,
                  testCoverage: codeRep.coverage?.overall_line_pct != null ? Math.round(codeRep.coverage.overall_line_pct * 100) : null,
                  linesAnalyzed: linesAnalyzed || undefined,
                  metadata: codeRep.metadata,
                  ai_interpretation: codeRep.ai_interpretation
               } : undefined,
               documentationAnalysis: docsRep ? {
                  issues: mappedDocsIssues,
                  report: docsRep
               } : undefined
             }
} else if (!reportObj && rawFull.status === 'COMPLETED') {
             // Fallback visivo per analisi vuote/fallite (tutti i report null)
             reportObj = {
               qualityScore: rawFull.overallScore || 0,
               securityScore: rawFull.securityScore || 0,
               documentationScore: rawFull.docsScore || 0,
               remediations: []
             }
          }

          repo.lastAnalysis = {
             id: rawFull.analysisId,
             date: rawFull.createdAt || rawFull.timestamp || new Date().toISOString(),
             status: mapStatus(rawFull.status),
             branch: rawFull.branch,
             commitHash: rawFull.commit,
             executionMetrics: rawFull.executionMetrics,
             report: reportObj
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
    try {
      const repos = await repositoriesApi.list();
      
      const ranked = repos
        .filter(r => r.lastAnalysis?.report != null)
        .map(r => {
           let scoreDecimals = r.lastAnalysis?.report?.qualityScore || 0;
           let sc = typeof scoreDecimals === 'number' ? Math.round(scoreDecimals) : parseInt(scoreDecimals, 10);
           return {
             repo: r,
             score: sc,
             date: r.lastAnalysis?.date,
             analyses: r.lastAnalysis
           };
        })
        .sort((a, b) => b.score - a.score);

      return ranked.map((r, i) => ({
        rank: i + 1,
        repository: r.repo,
        score: r.score,
        lastAnalyzed: r.date,
        scoreDelta: undefined
      }));
    } catch(e) {
      console.error('[getRanking Error]', e);
      return [];
    }
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
    try {
      const { data } = await gateway.get(`/repositories/full-details/${encodeURIComponent(url)}`)
      const payload = data.data || data
      const analysesList = payload.analyses || []
      
      const items = analysesList.map((a: any) => {
        const { reportObj, extMetrics } = calculateScores(a)
        return {
          id: a.analysisId,
          status: mapStatus(a.status),
          issuesCount: a.totalIssues || 0,
          score: reportObj?.qualityScore || a.overallScore || 0,
          startedAt: a.timestamp || a.createdAt || new Date().toISOString(),
          date: a.timestamp || a.createdAt || new Date().toISOString(),
          areas: [a.requestedCode && 'code', a.requestedSecurity && 'security', a.requestedDocumentation && 'documentation'].filter(Boolean),
          branch: a.branch,
          commitHash: a.commit,
          executionMetrics: extMetrics,
          report: reportObj
        }
      })
      
      return {
        items,
        total: items.length,
        page: params?.page ?? 1,
        limit: params?.limit ?? 10,
        totalPages: 1
      }
    } catch(e) {
      console.error('[getHistory Error]', e)
      return { items: [], total: 0, page: 1, limit: 10, totalPages: 1 }
    }
  },

  compareAnalyses: async (_id: string, _analysisIds: [string, string]): Promise<unknown> => {
    return {}
  },
}
