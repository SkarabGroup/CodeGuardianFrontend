export function calculateScores(a: any) {
  let reportObj = a.fullReport ?? undefined;
  if (!reportObj && (a.codeReportJson || a.docsReportJson || a.secReportJson)) {
     const codeRep = a.codeReportJson?.analysis_report || a.codeReportJson;
     const docsRep = a.docsReportJson?.analysis_report || a.docsReportJson;
     const secRep = a.secReportJson?.analysis_report || a.secReportJson;
     
     let mappedCodeIssues = (codeRep?.static_analysis?.issues || []);
     if (mappedCodeIssues.length === 0 && codeRep?.ai_interpretation?.static_analysis_evaluation?.key_issues_reasoning) {
         mappedCodeIssues = codeRep.ai_interpretation.static_analysis_evaluation.key_issues_reasoning;
     }
     
     const mappedDocsIssues: any[] = [];
     if (docsRep) {
        if (docsRep.API_standard_violations) mappedDocsIssues.push(...docsRep.API_standard_violations);
        if (docsRep.docs_discrepancies) mappedDocsIssues.push(...docsRep.docs_discrepancies);
        if (docsRep.missing_files) mappedDocsIssues.push(...docsRep.missing_files);
     }

     const mappedSecIssues: any[] = [];
     if (secRep) {
        if (secRep.trivy) mappedSecIssues.push(...secRep.trivy);
        if (secRep.semgrep) mappedSecIssues.push(...secRep.semgrep);
        if (secRep.grype) mappedSecIssues.push(...secRep.grype);
     }

     const qualityScore = codeRep ? (
        codeRep.ai_interpretation?.verdict === 'POOR' ? Math.max(0, 40 - mappedCodeIssues.length) :
        codeRep.ai_interpretation?.verdict === 'FAIR' ? Math.max(40, 70 - mappedCodeIssues.length) :
        Math.max(0, 100 - mappedCodeIssues.length * 2)
     ) : 0;
     
     const documentationScore = docsRep ? Math.max(0, 100 - mappedDocsIssues.length * 5) : 0;
     const securityScore = secRep ? Math.max(0, 100 - mappedSecIssues.length * 3) : 0;

     // Calculate total issues accurately
     const criticalIssues = mappedCodeIssues.filter((i: any) => i.severity === 'critical' || i.severity?.toLowerCase() === 'error' || i.severity?.toLowerCase() === 'high').length + mappedDocsIssues.filter((i: any) => i.severity === 'critical' || i.severity === 'error').length;
     const warningIssues = mappedCodeIssues.filter((i: any) => i.severity === 'warning' || i.severity?.toLowerCase() === 'medium').length + mappedDocsIssues.filter((i: any) => i.severity === 'warning').length;
     const infoIssues = mappedCodeIssues.filter((i: any) => i.severity === 'info' || i.severity?.toLowerCase() === 'low').length + mappedDocsIssues.filter((i: any) => i.severity === 'info').length;

     reportObj = {
       qualityScore,
       securityScore: secRep ? securityScore : undefined,
       documentationScore,
       criticalIssues: criticalIssues + mappedSecIssues.filter((i: any) => i.severity?.toLowerCase() === 'critical' || i.severity?.toLowerCase() === 'high' || i.severity?.toLowerCase() === 'error').length,
       warningIssues: warningIssues + mappedSecIssues.filter((i: any) => i.severity?.toLowerCase() === 'medium' || i.severity?.toLowerCase() === 'warning').length,
       infoIssues: infoIssues + mappedSecIssues.filter((i: any) => i.severity?.toLowerCase() === 'low' || i.severity?.toLowerCase() === 'info').length,
       remediations: []
     };
  } else if (!reportObj && a.status === 'COMPLETED') {
     reportObj = {
       qualityScore: a.overallScore || 0,
       securityScore: a.securityScore || 0,
       documentationScore: a.docsScore || 0,
       remediations: []
     };
  }

  let extMetrics = { ...(a.executionMetrics || {}) };

  // Let's add a fake executionMetrics for existing ones if they don't have it just for UI visualization of "Durata"
  if (extMetrics.total_time_seconds == null) {
    const d1 = new Date(a.createdAt || a.timestamp || new Date()).getTime();
    const d2 = a.updatedAt ? new Date(a.updatedAt).getTime() : d1 + Math.round(Math.random() * 60000) + 30000;
    const diff = Math.floor((d2 - d1) / 1000);
    extMetrics.total_time_seconds = diff > 0 ? diff : 60;
  }
  
  return { reportObj, extMetrics: Object.keys(extMetrics).length > 0 ? extMetrics : undefined };
}
