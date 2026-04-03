import { render, screen } from '@testing-library/react'
import { Input } from '@/components/ui/input'

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input />)
    expect(document.querySelector('input')).toBeInTheDocument()
  })

  it('renders with a placeholder', () => {
    render(<Input placeholder="Type here" />)
    expect(screen.getByPlaceholderText('Type here')).toBeInTheDocument()
  })

  it('accepts a type prop', () => {
    render(<Input type="email" />)
    expect(document.querySelector('input')).toHaveAttribute('type', 'email')
  })

  it('renders in disabled state', () => {
    render(<Input disabled />)
    expect(document.querySelector('input')).toBeDisabled()
  })

  it('applies custom className', () => {
    render(<Input className="my-class" />)
    expect(document.querySelector('input')!.className).toContain('my-class')
  })

  it('forwards additional props (e.g. aria-label)', () => {
    render(<Input aria-label="search" />)
    expect(screen.getByRole('textbox', { name: 'search' })).toBeInTheDocument()
  })

  it('renders as password type', () => {
    render(<Input type="password" />)
    expect(document.querySelector('input')).toHaveAttribute('type', 'password')
  })
})
