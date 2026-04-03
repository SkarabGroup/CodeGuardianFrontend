import { render, screen } from '@testing-library/react'
import { Badge, badgeVariants } from '@/components/ui/badge'

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Hello</Badge>)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('applies default variant (accent colours)', () => {
    render(<Badge data-testid="b">x</Badge>)
    expect(screen.getByTestId('b').className).toContain('accent')
  })

  it('applies custom className', () => {
    render(<Badge className="custom-class">x</Badge>)
    expect(screen.getByText('x').className).toContain('custom-class')
  })

  it('forwards additional HTML attributes', () => {
    render(<Badge aria-label="status badge">x</Badge>)
    expect(screen.getByLabelText('status badge')).toBeInTheDocument()
  })

  const variants = [
    'default', 'secondary', 'destructive', 'outline', 'success', 'warning', 'info',
  ] as const

  variants.forEach(variant => {
    it(`renders ${variant} variant without throwing`, () => {
      render(<Badge variant={variant}>{variant}</Badge>)
      expect(screen.getByText(variant)).toBeInTheDocument()
    })
  })

  it('exports badgeVariants helper', () => {
    expect(typeof badgeVariants).toBe('function')
    expect(typeof badgeVariants({})).toBe('string')
  })
})
