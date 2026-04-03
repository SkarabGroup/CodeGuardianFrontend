import { render } from '@testing-library/react'
import { Progress } from '@/components/ui/progress'

describe('Progress', () => {
  it('renders a progressbar element', () => {
    const { container } = render(<Progress value={50} />)
    expect(container.querySelector('[role="progressbar"]')).toBeInTheDocument()
  })

  it('renders without a value (undefined)', () => {
    const { container } = render(<Progress />)
    expect(container.querySelector('[role="progressbar"]')).toBeInTheDocument()
  })

  it('renders with value 0', () => {
    const { container } = render(<Progress value={0} />)
    const indicator = container.querySelector('[role="progressbar"] > *') as HTMLElement
    expect(indicator.style.transform).toBe('translateX(-100%)')
  })

  it('renders with value 100', () => {
    const { container } = render(<Progress value={100} />)
    const indicator = container.querySelector('[role="progressbar"] > *') as HTMLElement
    expect(indicator.style.transform).toBe('translateX(-0%)')
  })

  it('renders with value 50', () => {
    const { container } = render(<Progress value={50} />)
    const indicator = container.querySelector('[role="progressbar"] > *') as HTMLElement
    expect(indicator.style.transform).toBe('translateX(-50%)')
  })

  it('applies custom className to root', () => {
    const { container } = render(<Progress value={50} className="custom-root" />)
    const root = container.firstChild as HTMLElement
    expect(root.className).toContain('custom-root')
  })

  it('applies indicatorClassName to indicator', () => {
    const { container } = render(<Progress value={50} indicatorClassName="my-indicator" />)
    const indicator = container.querySelector('.my-indicator')
    expect(indicator).toBeInTheDocument()
  })
})
