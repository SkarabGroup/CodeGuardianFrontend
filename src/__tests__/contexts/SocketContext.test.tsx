import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useContext } from 'react'
import { SocketContext, SocketProvider } from '@/contexts/SocketContext'

function TestConsumer() {
  const { socket, isConnected } = useContext(SocketContext)
  return (
    <div>
      <span data-testid="socket">{socket === null ? 'null' : 'connected'}</span>
      <span data-testid="connected">{String(isConnected)}</span>
    </div>
  )
}

describe('SocketContext', () => {
  it('provides socket: null and isConnected: false', () => {
    render(<SocketProvider><TestConsumer /></SocketProvider>)
    expect(screen.getByTestId('socket')).toHaveTextContent('null')
    expect(screen.getByTestId('connected')).toHaveTextContent('false')
  })

  it('renders children', () => {
    render(<SocketProvider><span data-testid="child">hello</span></SocketProvider>)
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })
})
