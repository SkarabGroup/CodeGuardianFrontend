import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { tokenStorage } from '@/api/gateway'
import { AuthContext } from './AuthContext'

const WS_URL = import.meta.env.VITE_ANALYSIS_WS_URL ?? 'http://localhost:3002'

interface SocketContextValue {
  socket: Socket | null
  isConnected: boolean
}

export const SocketContext = createContext<SocketContextValue>({ socket: null, isConnected: false })

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const auth = useContext(AuthContext)
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!auth?.isAuthenticated) {
      socketRef.current?.disconnect()
      socketRef.current = null
      setIsConnected(false)
      return
    }

    const socket = io(WS_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: { token: tokenStorage.getAccess() },
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 5,
    })

    socket.on('connect', () => setIsConnected(true))
    socket.on('disconnect', () => setIsConnected(false))
    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message)
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
      socketRef.current = null
      setIsConnected(false)
    }
  }, [auth?.isAuthenticated])

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected }}>
      {children}
    </SocketContext.Provider>
  )
}
