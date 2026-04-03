import { render } from '@testing-library/react'
import { Separator } from '@/components/ui/separator'

describe('Separator', () => {
  it('renders a horizontal separator by default', () => {
    const { container } = render(<Separator />)
    const el = container.firstChild as HTMLElement
    expect(el).toBeInTheDocument()
    expect(el.className).toContain('h-[1px]')
    expect(el.className).toContain('w-full')
  })

  it('renders a vertical separator', () => {
    const { container } = render(<Separator orientation="vertical" />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('h-full')
    expect(el.className).toContain('w-[1px]')
  })

  it('applies custom className', () => {
    const { container } = render(<Separator className="my-divider" />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('my-divider')
  })

  it('renders as non-decorative when decorative=false', () => {
    const { container } = render(<Separator decorative={false} />)
    const el = container.firstChild as HTMLElement
    expect(el).toBeInTheDocument()
  })
})
