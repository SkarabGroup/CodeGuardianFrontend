import { cn } from '@/lib/utils'
import { getScoreVar } from '@/lib/utils'

interface ScoreCardProps {
  label: string
  score: number
  icon: React.ReactNode
  description?: string
  className?: string
}

/** Tick marks around the gauge */
function GaugeTicks({ count = 20 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * 270 - 135
        const rad = (angle * Math.PI) / 180
        const r = 38
        const x1 = 44 + r * Math.cos(rad)
        const y1 = 44 + r * Math.sin(rad)
        const x2 = 44 + (r + (i % 5 === 0 ? 5 : 3)) * Math.cos(rad)
        const y2 = 44 + (r + (i % 5 === 0 ? 5 : 3)) * Math.sin(rad)
        return (
          <line
            key={i}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={i % 5 === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'}
            strokeWidth={i % 5 === 0 ? 1.5 : 1}
            strokeLinecap="round"
          />
        )
      })}
    </>
  )
}

export function ScoreCard({ label, score, icon, description, className }: ScoreCardProps) {
  const color = getScoreVar(score)
  const clampedScore = Math.max(0, Math.min(100, score))

  // Arc from -135° to +135° (270° sweep)
  const R = 32
  const CX = 44
  const CY = 44
  const SIZE = 88

  const toRad = (deg: number) => (deg * Math.PI) / 180

  const startAngle = -135
  const endAngleFull = 135
  const progressAngle = startAngle + (clampedScore / 100) * 270

  function arcPath(fromDeg: number, toDeg: number) {
    const x1 = CX + R * Math.cos(toRad(fromDeg))
    const y1 = CY + R * Math.sin(toRad(fromDeg))
    const x2 = CX + R * Math.cos(toRad(toDeg))
    const y2 = CY + R * Math.sin(toRad(toDeg))
    const large = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`
  }

  return (
    <div
      className={cn(
        'bg-[var(--surface)] border border-[var(--border)]',
        'p-5 flex flex-col gap-4',
        'hover:border-[var(--border-mid)] transition-colors duration-150',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="data-label">{label}</p>
          {description && <p className="font-mono text-[10px] text-[var(--fg-3)] mt-0.5">{description}</p>}
        </div>
        <span className="text-[var(--fg-3)]">{icon}</span>
      </div>

      {/* Gauge + value */}
      <div className="flex items-center gap-5">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="shrink-0">
          {/* Tick marks */}
          <GaugeTicks count={20} />

          {/* Background arc */}
          <path
            d={arcPath(startAngle, endAngleFull)}
            fill="none"
            stroke="var(--surface-3)"
            strokeWidth={4}
            strokeLinecap="round"
          />

          {/* Progress arc */}
          {clampedScore > 0 && (
            <path
              d={arcPath(startAngle, progressAngle)}
              fill="none"
              stroke={color}
              strokeWidth={4}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 4px ${color}60)` }}
            />
          )}

          {/* Needle dot */}
          {clampedScore > 0 && (
            <circle
              cx={CX + R * Math.cos(toRad(progressAngle))}
              cy={CY + R * Math.sin(toRad(progressAngle))}
              r={3}
              fill={color}
              style={{ filter: `drop-shadow(0 0 3px ${color})` }}
            />
          )}

          {/* Centre value */}
          <text
            x={CX} y={CY + 4}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="16"
            fontWeight="300"
            fontFamily="'IBM Plex Mono', monospace"
            fill={color}
            style={{ fontFeatureSettings: '"tnum"' }}
          >
            {score}
          </text>
        </svg>

        {/* Right side: bar + scale */}
        <div className="flex-1">
          <div className="flex justify-between mb-1">
            <span className="data-label">0</span>
            <span className="data-label">100</span>
          </div>
          <div className="relative h-[3px] w-full bg-[var(--surface-3)]">
            <div
              className="absolute inset-y-0 left-0 transition-none"
              style={{ width: `${clampedScore}%`, background: color, boxShadow: `0 0 6px ${color}60` }}
            />
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span
              className="font-mono font-300 leading-none"
              style={{ fontSize: '28px', color, fontFeatureSettings: '"tnum"' }}
            >
              {score}
            </span>
            <span className="data-label">/100</span>
          </div>
          <p
            className="font-mono text-[10px] mt-1"
            style={{ color }}
          >
            {score >= 80 ? 'HIGH' : score >= 60 ? 'MEDIUM' : 'LOW'}
          </p>
        </div>
      </div>
    </div>
  )
}
