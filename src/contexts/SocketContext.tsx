import { createContext } from 'react'

interface SocketContextValue {
  socket: null
  isConnected: boolean
}

// Stiamo passando ai poll, il Socket Context esporta stub vuoti per non rompere l'interfaccia
export const SocketContext = createContext<SocketContextValue>({ socket: null, isConnected: false })

export function SocketProvider({ children }: { children: React.ReactNode }) {
  // Socket.io è stato disattivato per passare ai poll ogni tot
  return (
    <SocketContext.Provider value={{ socket: null, isConnected: false }}>
      {children}
    </SocketContext.Provider>
  )
}
