import { render, screen } from '@testing-library/react'
import { AnalysisStatusBadge } from '@/components/analysis/AnalysisStatusBadge'
import type { AnalysisStatus } from '@/types'

const labels: Record<AnalysisStatus, string> = {
  'not-analyzed': 'NOT ANALYZED',
  pending:        'QUEUED',
  'in-progress':  'RUNNING',
  completed:      'COMPLETED',
  failed:         'FAILED',
}

describe('AnalysisStatusBadge', () => {
  // ── Label text ─────────────────────────────────────────────
  Object.entries(labels).forEach(([status, label]) => {
    it(`shows "${label}" for status "${status}"`, () => {
      render(<AnalysisStatusBadge status={status as AnalysisStatus} />)
      expect(screen.getByText(label)).toBeInTheDocument()
    })
  })

  // ── Pulse dot ──────────────────────────────────────────────
  it('shows pulse animation for "pending"', () => {
    const { container } = render(<AnalysisStatusBadge status="pending" />)
    expect(container.querySelector('.animate-ping-slow')).toBeInTheDocument()
  })

  it('shows pulse animation for "in-progress"', () => {
    const { container } = render(<AnalysisStatusBadge status="in-progress" />)
    expect(container.querySelector('.animate-ping-slow')).toBeInTheDocument()
  })

  it('does not show pulse for "not-analyzed"', () => {
    const { container } = render(<AnalysisStatusBadge status="not-analyzed" />)
    expect(container.querySelector('.animate-ping-slow')).not.toBeInTheDocument()
  })

  it('does not show pulse for "completed"', () => {
    const { container } = render(<AnalysisStatusBadge status="completed" />)
    expect(container.querySelector('.animate-ping-slow')).not.toBeInTheDocument()
  })

  it('does not show pulse for "failed"', () => {
    const { container } = render(<AnalysisStatusBadge status="failed" />)
    expect(container.querySelector('.animate-ping-slow')).not.toBeInTheDocument()
  })

  // ── Custom className ────────────────────────────────────────
  it('forwards custom className to the root span', () => {
    const { container } = render(
      <AnalysisStatusBadge status="completed" className="extra-class" />,
    )
    expect((container.firstChild as HTMLElement).className).toContain('extra-class')
  })
})
