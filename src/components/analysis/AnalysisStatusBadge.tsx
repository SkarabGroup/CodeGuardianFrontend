import { cn } from '@/lib/utils'
import type { AnalysisStatus } from '@/types'

interface Props {
  status: AnalysisStatus
  className?: string
}

const config: Record<AnalysisStatus, {
  label: string
  color: string
  bg: string
  pulse: boolean
}> = {
  'not-analyzed': { label: 'NOT ANALYZED', color: 'var(--fg-3)',    bg: 'transparent',         pulse: false },
  pending:        { label: 'QUEUED',        color: 'var(--warning)', bg: 'var(--warning-dim)',  pulse: true  },
  'in-progress':  { label: 'RUNNING',       color: 'var(--accent)',  bg: 'var(--accent-dim)',   pulse: true  },
  completed:      { label: 'COMPLETED',     color: 'var(--success)', bg: 'var(--success-dim)',  pulse: false },
  failed:         { label: 'FAILED',        color: 'var(--danger)',  bg: 'var(--danger-dim)',   pulse: false },
}

export function AnalysisStatusBadge({ status, className }: Props) {
  const { label, color, bg, pulse } = config[status]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5',
        'rounded-[var(--radius-sm)] border px-2 py-0.5',
        'font-mono text-[10px] tracking-widest',
        className,
      )}
      style={{
        color,
        background: bg,
        borderColor: `${color}30`,
      }}
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        {pulse && (
          <span
            className="absolute inline-flex h-full w-full rounded-full animate-ping-slow"
            style={{ background: color, opacity: 0.6 }}
          />
        )}
        <span
          className="relative inline-flex h-1.5 w-1.5 rounded-full"
          style={{
            background: color,
            boxShadow: pulse ? `0 0 4px ${color}` : 'none',
          }}
        />
      </span>
      {label}
    </span>
  )
}
