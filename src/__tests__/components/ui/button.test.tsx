import { render, screen } from '@testing-library/react'
import { Button, buttonVariants } from '@/components/ui/button'

describe('Button', () => {
  it('renders as a <button> by default', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('renders as the child element when asChild=true', () => {
    render(
      <Button asChild>
        <a href="/">Go home</a>
      </Button>,
    )
    expect(screen.getByRole('link', { name: 'Go home' })).toBeInTheDocument()
  })

  it('renders in disabled state', () => {
    render(<Button disabled>Click</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('applies custom className', () => {
    render(<Button className="extra">Click</Button>)
    expect(screen.getByRole('button').className).toContain('extra')
  })

  it('forwards additional props (e.g. type="submit")', () => {
    render(<Button type="submit">Submit</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })

  const variants = [
    'default', 'destructive', 'outline', 'secondary', 'ghost', 'link', 'accent',
  ] as const

  variants.forEach(v => {
    it(`renders ${v} variant`, () => {
      render(<Button variant={v}>{v}</Button>)
      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })

  const sizes = ['default', 'sm', 'lg', 'icon', 'icon-sm'] as const

  sizes.forEach(s => {
    it(`renders ${s} size`, () => {
      render(<Button size={s}>X</Button>)
      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })

  it('exports buttonVariants helper', () => {
    expect(typeof buttonVariants).toBe('function')
    expect(typeof buttonVariants({})).toBe('string')
  })
})
