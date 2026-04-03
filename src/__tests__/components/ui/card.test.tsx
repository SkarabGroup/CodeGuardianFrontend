import { render, screen } from '@testing-library/react'
import {
  Card, CardHeader, CardTitle,
  CardDescription, CardContent, CardFooter,
} from '@/components/ui/card'

describe('Card', () => {
  it('renders children', () => {
    render(<Card data-testid="card">content</Card>)
    expect(screen.getByTestId('card')).toBeInTheDocument()
    expect(screen.getByText('content')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<Card data-testid="card" className="custom" />)
    expect(screen.getByTestId('card').className).toContain('custom')
  })
})

describe('CardHeader', () => {
  it('renders children', () => {
    render(<CardHeader data-testid="h">header content</CardHeader>)
    expect(screen.getByTestId('h')).toBeInTheDocument()
    expect(screen.getByText('header content')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<CardHeader data-testid="h" className="my-header" />)
    expect(screen.getByTestId('h').className).toContain('my-header')
  })
})

describe('CardTitle', () => {
  it('renders as an h3', () => {
    render(<CardTitle>My Title</CardTitle>)
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('My Title')
  })

  it('applies custom className', () => {
    render(<CardTitle className="extra">Title</CardTitle>)
    expect(screen.getByRole('heading').className).toContain('extra')
  })
})

describe('CardDescription', () => {
  it('renders text', () => {
    render(<CardDescription>A description</CardDescription>)
    expect(screen.getByText('A description')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<CardDescription className="desc-class">desc</CardDescription>)
    expect(screen.getByText('desc').className).toContain('desc-class')
  })
})

describe('CardContent', () => {
  it('renders children', () => {
    render(<CardContent data-testid="c">body</CardContent>)
    expect(screen.getByTestId('c')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<CardContent data-testid="c" className="body-class" />)
    expect(screen.getByTestId('c').className).toContain('body-class')
  })
})

describe('CardFooter', () => {
  it('renders children', () => {
    render(<CardFooter data-testid="f">footer</CardFooter>)
    expect(screen.getByTestId('f')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<CardFooter data-testid="f" className="footer-class" />)
    expect(screen.getByTestId('f').className).toContain('footer-class')
  })
})

describe('Card composition', () => {
  it('renders all sub-components together', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    )
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
    expect(screen.getByText('Footer')).toBeInTheDocument()
  })
})
