import { render, screen } from '@testing-library/react'
import { Skeleton } from '@/components/ui/skeleton'

describe('Skeleton', () => {
  it('renders a div', () => {
    render(<Skeleton data-testid="sk" />)
    expect(screen.getByTestId('sk')).toBeInTheDocument()
  })

  it('includes the animate-pulse class', () => {
    render(<Skeleton data-testid="sk" />)
    expect(screen.getByTestId('sk').className).toContain('animate-pulse')
  })

  it('merges custom className', () => {
    render(<Skeleton data-testid="sk" className="h-12 w-full" />)
    const el = screen.getByTestId('sk')
    expect(el.className).toContain('h-12')
    expect(el.className).toContain('w-full')
  })

  it('forwards additional HTML attributes', () => {
    render(<Skeleton data-testid="sk" aria-label="Loading..." />)
    expect(screen.getByTestId('sk')).toHaveAttribute('aria-label', 'Loading...')
  })
})
