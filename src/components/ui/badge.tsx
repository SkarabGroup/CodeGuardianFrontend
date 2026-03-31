import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-0.5 font-mono text-[10px] font-400 tracking-widest uppercase border',
  {
    variants: {
      variant: {
        default:     'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--accent-glow)]',
        secondary:   'bg-[var(--surface-3)] text-[var(--fg-2)] border-[var(--border)]',
        destructive: 'bg-[var(--danger-dim)] text-[var(--danger)] border-[var(--danger-dim)]',
        outline:     'bg-transparent text-[var(--fg-2)] border-[var(--border-mid)]',
        success:     'bg-[var(--success-dim)] text-[var(--success)] border-[var(--success-dim)]',
        warning:     'bg-[var(--warning-dim)] text-[var(--warning)] border-[var(--warning-dim)]',
        info:        'bg-[var(--info-dim)] text-[var(--info)] border-[var(--info-dim)]',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { badgeVariants }
