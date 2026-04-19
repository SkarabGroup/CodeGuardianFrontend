import { render, screen } from '@testing-library/react'
import { ScoreCard } from '@/components/shared/ScoreCard'

const icon = <span data-testid="icon">⚡</span>

describe('ScoreCard', () => {
  // ── Basic rendering ─────────────────────────────────────────
  it('renders the label', () => {
    render(<ScoreCard label="QUALITÀ" score={80} icon={icon} />)
    expect(screen.getByText('QUALITÀ')).toBeInTheDocument()
  })

  it('renders the icon', () => {
    render(<ScoreCard label="TEST" score={80} icon={icon} />)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('renders the score value', () => {
    render(<ScoreCard label="TEST" score={87} icon={icon} />)
    // Score appears in the SVG text and in the bar below
    const matches = screen.getAllByText('87')
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it('renders an SVG gauge', () => {
    const { container } = render(<ScoreCard label="TEST" score={75} icon={icon} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  // ── Description ────────────────────────────────────────────
  it('renders description when provided', () => {
    render(<ScoreCard label="TEST" score={80} icon={icon} description="Testo di supporto" />)
    expect(screen.getByText('Testo di supporto')).toBeInTheDocument()
  })

  it('does not render description when absent', () => {
    render(<ScoreCard label="TEST" score={80} icon={icon} />)
    expect(screen.queryByText('Testo di supporto')).not.toBeInTheDocument()
  })

  // ── Score category text ────────────────────────────────────
  it('shows HIGH for score >= 80', () => {
    render(<ScoreCard label="T" score={80} icon={icon} />)
    expect(screen.getByText('HIGH')).toBeInTheDocument()
  })

  it('shows HIGH for score 100', () => {
    render(<ScoreCard label="T" score={100} icon={icon} />)
    expect(screen.getByText('HIGH')).toBeInTheDocument()
  })

  it('shows MEDIUM for score 60', () => {
    render(<ScoreCard label="T" score={60} icon={icon} />)
    expect(screen.getByText('MEDIUM')).toBeInTheDocument()
  })

  it('shows MEDIUM for score 79', () => {
    render(<ScoreCard label="T" score={79} icon={icon} />)
    expect(screen.getByText('MEDIUM')).toBeInTheDocument()
  })

  it('shows LOW for score 59', () => {
    render(<ScoreCard label="T" score={59} icon={icon} />)
    expect(screen.getByText('LOW')).toBeInTheDocument()
  })

  it('shows LOW for score 0', () => {
    render(<ScoreCard label="T" score={0} icon={icon} />)
    expect(screen.getByText('LOW')).toBeInTheDocument()
  })

  // ── Arc rendering branches ─────────────────────────────────
  it('renders without progress arc when score is 0', () => {
    // Score 0 → clampedScore > 0 is false → no arc path rendered
    const { container } = render(<ScoreCard label="T" score={0} icon={icon} />)
    // Background arc always present, progress arc absent
    const paths = container.querySelectorAll('path')
    expect(paths.length).toBe(1) // only background arc
  })

  it('renders with a small arc when score is 65 (< 180° sweep)', () => {
    // 65/100 * 270 = 175.5° → large-arc-flag = 0
    const { container } = render(<ScoreCard label="T" score={65} icon={icon} />)
    const paths = container.querySelectorAll('path')
    expect(paths.length).toBe(2) // background + progress
  })

  it('renders with a large arc when score is 75 (> 180° sweep)', () => {
    // 75/100 * 270 = 202.5° → large-arc-flag = 1
    const { container } = render(<ScoreCard label="T" score={75} icon={icon} />)
    const paths = container.querySelectorAll('path')
    expect(paths.length).toBe(2)
  })

  it('renders needle dot when score > 0', () => {
    const { container } = render(<ScoreCard label="T" score={50} icon={icon} />)
    expect(container.querySelector('circle')).toBeInTheDocument()
  })

  it('does not render needle dot when score is 0', () => {
    const { container } = render(<ScoreCard label="T" score={0} icon={icon} />)
    expect(container.querySelector('circle')).not.toBeInTheDocument()
  })

  // ── Custom className ────────────────────────────────────────
  it('applies custom className to root', () => {
    const { container } = render(<ScoreCard label="T" score={80} icon={icon} className="my-card" />)
    expect((container.firstChild as HTMLElement).className).toContain('my-card')
  })

  // ── Null / NaN Score ────────────────────────────────────────
  it('handles null score correctly', () => {
    render(<ScoreCard label="T" score={null} icon={icon} />)
    const matches = screen.getAllByText('--')
    expect(matches.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('N/A')).toBeInTheDocument()
  })

  it('handles undefined score correctly', () => {
    render(<ScoreCard label="T" score={undefined} icon={icon} />)
    const matches = screen.getAllByText('--')
    expect(matches.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('N/A')).toBeInTheDocument()
  })

  it('handles NaN score correctly', () => {
    render(<ScoreCard label="T" score={NaN} icon={icon} />)
    const matches = screen.getAllByText('--')
    expect(matches.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('N/A')).toBeInTheDocument()
  })

  it('handles out of bounds scores (negative)', () => {
    const { container } = render(<ScoreCard label="T" score={-10} icon={icon} />)
    expect(screen.getByText('LOW')).toBeInTheDocument() // -10 is clamped to 0
    const paths = container.querySelectorAll('path')
    expect(paths.length).toBe(1) // only background arc
  })

  it('handles out of bounds scores (over 100)', () => {
    const { container } = render(<ScoreCard label="T" score={150} icon={icon} />)
    expect(screen.getByText('HIGH')).toBeInTheDocument() // 150 is clamped to 100
    const paths = container.querySelectorAll('path')
    expect(paths.length).toBe(2) // background + full progress arc
  })
})
