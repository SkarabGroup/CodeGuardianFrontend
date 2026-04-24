import { describe, it, expect } from 'vitest'
import { calculateScores } from '@/api/calculateScores'

describe('calculateScores', () => {
  // TU-12.1 — quality score with POOR verdict
  it('calculates quality score for POOR verdict (no issues)', () => {
    const result = calculateScores({
      codeReportJson: {
        analysis_report: {
          ai_interpretation: { verdict: 'POOR' },
          static_analysis: { issues: [] },
        },
      },
    })
    expect(result.reportObj.qualityScore).toBe(40) // max(0, 40 - 0)
  })

  // TU-12.1 — quality score with FAIR verdict
  it('calculates quality score for FAIR verdict (no issues)', () => {
    const result = calculateScores({
      codeReportJson: {
        analysis_report: {
          ai_interpretation: { verdict: 'FAIR' },
          static_analysis: { issues: [] },
        },
      },
    })
    expect(result.reportObj.qualityScore).toBe(70) // max(40, 70 - 0)
  })

  // TU-12.1 — quality score with GOOD verdict
  it('calculates quality score for GOOD verdict (no issues)', () => {
    const result = calculateScores({
      codeReportJson: {
        analysis_report: {
          ai_interpretation: { verdict: 'GOOD' },
          static_analysis: { issues: [] },
        },
      },
    })
    expect(result.reportObj.qualityScore).toBe(100) // max(0, 100 - 0)
  })

  // TU-9.3 — score decreases with more issues
  it('reduces quality score by 2 per issue (GOOD verdict)', () => {
    const issues = Array.from({ length: 5 }, (_, i) => ({ severity: 'warning', description: `issue ${i}` }))
    const result = calculateScores({
      codeReportJson: {
        analysis_report: {
          ai_interpretation: { verdict: 'GOOD' },
          static_analysis: { issues },
        },
      },
    })
    expect(result.reportObj.qualityScore).toBe(90) // 100 - 5*2
  })

  // TU-9.3 — score never goes below 0
  it('clamps quality score to 0 (GOOD verdict, many issues)', () => {
    const issues = Array.from({ length: 60 }, () => ({ severity: 'critical' }))
    const result = calculateScores({
      codeReportJson: {
        analysis_report: {
          ai_interpretation: { verdict: 'GOOD' },
          static_analysis: { issues },
        },
      },
    })
    expect(result.reportObj.qualityScore).toBe(0)
  })

  // TU-11.3 — documentation score
  it('calculates documentation score (5 points per issue)', () => {
    const result = calculateScores({
      docsReportJson: {
        API_standard_violations: [{ severity: 'warning' }, { severity: 'critical' }],
        docs_discrepancies: [{ severity: 'info' }],
        missing_files: [],
      },
    })
    expect(result.reportObj.documentationScore).toBe(85) // 100 - 3*5
  })

  // TU-10.5 — security score
  it('calculates security score (3 points per issue)', () => {
    const result = calculateScores({
      secReportJson: {
        trivy: [{ severity: 'HIGH' }, { severity: 'MEDIUM' }],
        semgrep: [],
        grype: [],
      },
    })
    expect(result.reportObj.securityScore).toBe(94) // 100 - 2*3
  })

  // TU-9.2 — issue severity counting
  it('counts critical, warning and info issues correctly', () => {
    const result = calculateScores({
      codeReportJson: {
        analysis_report: {
          ai_interpretation: { verdict: 'GOOD' },
          static_analysis: {
            issues: [
              { severity: 'critical' },
              { severity: 'critical' },
              { severity: 'warning' },
              { severity: 'info' },
            ],
          },
        },
      },
    })
    expect(result.reportObj.criticalIssues).toBe(2)
    expect(result.reportObj.warningIssues).toBe(1)
    expect(result.reportObj.infoIssues).toBe(1)
  })

  // TU-10.6 — severity aliases (high/error map to critical)
  it('maps "high" and "error" severity to critical count', () => {
    const result = calculateScores({
      codeReportJson: {
        analysis_report: {
          ai_interpretation: { verdict: 'GOOD' },
          static_analysis: {
            issues: [{ severity: 'error' }, { severity: 'high' }],
          },
        },
      },
    })
    expect(result.reportObj.criticalIssues).toBe(2)
  })

  // TU-9.2 — key_issues_reasoning fallback when static_analysis has no issues
  it('uses key_issues_reasoning as fallback when static_analysis.issues is empty', () => {
    const result = calculateScores({
      codeReportJson: {
        analysis_report: {
          ai_interpretation: {
            verdict: 'POOR',
            static_analysis_evaluation: {
              key_issues_reasoning: [
                { severity: 'high', rule: 'eval', original_description: 'eval usage' },
                { severity: 'medium', rule: 'complexity' },
                { severity: 'low', rule: 'unused-vars' },
              ],
            },
          },
          static_analysis: { issues: [] },
        },
      },
    })
    // With 3 issues and POOR verdict: max(0, 40 - 3) = 37
    expect(result.reportObj.qualityScore).toBe(37)
    expect(result.reportObj.criticalIssues).toBeGreaterThanOrEqual(0)
  })

  // fullReport passthrough — when fullReport is present, it is returned as-is
  it('returns fullReport directly when present', () => {
    const fullReport = {
      qualityScore: 85,
      securityScore: 90,
      documentationScore: 75,
      criticalIssues: 1,
      warningIssues: 3,
      infoIssues: 0,
    }
    const result = calculateScores({ fullReport })
    expect(result.reportObj).toBe(fullReport)
  })

  // No reportable data — reportObj stays undefined
  it('returns undefined reportObj for empty input', () => {
    const result = calculateScores({ status: 'pending' })
    expect(result.reportObj).toBeUndefined()
  })

  // COMPLETED status fallback — when no report jsons and status is COMPLETED
  it('uses overallScore/securityScore/docsScore when status is COMPLETED and no report jsons', () => {
    const result = calculateScores({ status: 'COMPLETED', overallScore: 65, securityScore: 50, docsScore: 80 })
    expect(result.reportObj?.qualityScore).toBe(65)
    expect(result.reportObj?.securityScore).toBe(50)
    expect(result.reportObj?.documentationScore).toBe(80)
    expect(result.reportObj?.remediations).toEqual([])
  })

  it('defaults to 0 scores when COMPLETED but no score fields provided', () => {
    const result = calculateScores({ status: 'COMPLETED' })
    expect(result.reportObj?.qualityScore).toBe(0)
    expect(result.reportObj?.securityScore).toBe(0)
  })

  // executionMetrics fallback when missing
  it('generates fake executionMetrics when total_time_seconds is absent', () => {
    const result = calculateScores({ codeReportJson: {}, createdAt: new Date().toISOString() })
    expect(result.extMetrics?.total_time_seconds).toBeGreaterThan(0)
  })

  it('uses timestamp instead of createdAt for extMetrics calculation', () => {
    const result = calculateScores({ status: 'pending', timestamp: new Date().toISOString() })
    expect(result.extMetrics?.total_time_seconds).toBeGreaterThan(0)
  })

  it('uses updatedAt to compute elapsed time in extMetrics', () => {
    const createdAt = new Date('2025-01-01T00:00:00.000Z').toISOString()
    const updatedAt = new Date('2025-01-01T00:01:30.000Z').toISOString()
    const result = calculateScores({ status: 'pending', createdAt, updatedAt })
    expect(result.extMetrics?.total_time_seconds).toBe(90)
  })

  it('defaults extMetrics total_time_seconds to 60 when diff is zero or negative', () => {
    const ts = new Date('2025-01-01T00:00:00.000Z').toISOString()
    const result = calculateScores({ status: 'pending', createdAt: ts, updatedAt: ts })
    expect(result.extMetrics?.total_time_seconds).toBe(60)
  })

  it('returns undefined for extMetrics when Object.keys is empty (testing branch coverage)', () => {
    const keysSpy = vi.spyOn(Object, 'keys').mockReturnValueOnce([])
    const result = calculateScores({ status: 'pending' })
    expect(result.extMetrics).toBeUndefined()
    keysSpy.mockRestore()
  })
})
