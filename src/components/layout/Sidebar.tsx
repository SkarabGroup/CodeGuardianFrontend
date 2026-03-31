import { useState, useContext } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  GitBranch,
  History,
  Trophy,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { SocketContext } from '@/contexts/SocketContext'
import { toast } from 'sonner'

const navItems = [
  { to: '/repositories', icon: GitBranch, label: 'Repository' },
  { to: '/history',      icon: History,   label: 'Storico' },
  { to: '/ranking',      icon: Trophy,    label: 'Classifica' },
  { to: '/settings',     icon: Settings,  label: 'Impostazioni' },
]

// Shield icon as SVG (distinctive)
function ShieldMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M10 2L3 5v5c0 4 3.1 7.5 7 8.5C14 17.5 17 14 17 10V5L10 2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M7 10l2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuth()
  const { isConnected } = useContext(SocketContext)
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    toast.success('Disconnesso')
    navigate('/login')
  }

  return (
    <aside
      className={cn(
        'relative flex flex-col',
        'bg-[var(--surface)] border-r border-[var(--border)]',
        'transition-all duration-200 ease-out',
        collapsed ? 'w-[52px]' : 'w-[220px]',
      )}
    >
      {/* ── Logo ─────────────────────────────── */}
      <div
        className={cn(
          'flex items-center border-b border-[var(--border)] h-14',
          collapsed ? 'justify-center px-0' : 'gap-3 px-4',
        )}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center text-[var(--accent)]">
          <ShieldMark size={18} />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-display text-sm font-700 tracking-tight text-[var(--fg)] leading-none">
              Code<span className="text-[var(--accent)]">Guardian</span>
            </p>
            <p className="data-label mt-0.5">v1.0 · beta</p>
          </div>
        )}
      </div>

      {/* ── Connection status ────────────────── */}
      {!collapsed && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--border)]">
          <span
            className={cn(
              'led',
              isConnected
                ? 'bg-[var(--success)] shadow-[0_0_4px_var(--success)]'
                : 'bg-[var(--fg-3)]',
            )}
          />
          <span className="data-label">
            {isConnected ? 'live · connected' : 'disconnected'}
          </span>
          {isConnected && (
            <span className="relative ml-auto flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-[var(--success)] opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
            </span>
          )}
        </div>
      )}

      {/* ── Nav ──────────────────────────────── */}
      <nav className="flex-1 py-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center h-9 transition-colors duration-100',
                collapsed ? 'justify-center px-0 mx-2 rounded-[var(--radius-sm)]' : 'gap-3 px-4',
                isActive
                  ? 'text-[var(--accent)] bg-[var(--accent-dim)]'
                  : 'text-[var(--fg-3)] hover:text-[var(--fg-2)] hover:bg-[var(--surface-2)]',
              )
            }
          >
            {({ isActive }) => (
              <>
                {/* Active indicator bar */}
                {!collapsed && isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2px] bg-[var(--accent)] rounded-r-full" />
                )}
                <Icon className="h-[15px] w-[15px] shrink-0" strokeWidth={1.75} />
                {!collapsed && (
                  <span className="font-body text-[13px] font-medium">{label}</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── User footer ──────────────────────── */}
      <div className="border-t border-[var(--border)]">
        {!collapsed && user && (
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <p className="text-[13px] font-medium text-[var(--fg)] truncate leading-none">{user.username}</p>
            <p className="data-label mt-1 truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          title={collapsed ? 'Esci' : undefined}
          className={cn(
            'flex w-full items-center h-9 transition-colors duration-100',
            'text-[var(--fg-3)] hover:text-[var(--danger)] hover:bg-[var(--danger-dim)]',
            collapsed ? 'justify-center px-0 mx-0' : 'gap-3 px-4',
          )}
        >
          <LogOut className="h-[15px] w-[15px] shrink-0" strokeWidth={1.75} />
          {!collapsed && <span className="font-body text-[13px] font-medium">Esci</span>}
        </button>
      </div>

      {/* ── Collapse toggle ───────────────────── */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className={cn(
          'absolute -right-[13px] top-[52px]',
          'flex h-6 w-6 items-center justify-center',
          'rounded-full border border-[var(--border-mid)] bg-[var(--surface)]',
          'text-[var(--fg-3)] hover:text-[var(--fg)] hover:border-[var(--border-strong)]',
          'transition-colors duration-100 z-10',
        )}
      >
        {collapsed
          ? <ChevronRight className="h-3 w-3" />
          : <ChevronLeft className="h-3 w-3" />
        }
      </button>
    </aside>
  )
}
