import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'font-body text-sm font-medium tracking-wide',
    'transition-all duration-150',
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]',
    'disabled:pointer-events-none disabled:opacity-30',
    'cursor-pointer select-none',
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          'bg-[var(--accent)] text-[var(--bg)]',
          'hover:brightness-110 active:brightness-95',
          'rounded-[var(--radius-sm)]',
        ].join(' '),
        destructive: [
          'bg-[var(--danger)] text-white',
          'hover:brightness-110 active:brightness-90',
          'rounded-[var(--radius-sm)]',
        ].join(' '),
        outline: [
          'border border-[var(--border-mid)] bg-transparent text-[var(--fg)]',
          'hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]',
          'rounded-[var(--radius-sm)]',
        ].join(' '),
        secondary: [
          'bg-[var(--surface-3)] text-[var(--fg-2)]',
          'border border-[var(--border)]',
          'hover:text-[var(--fg)] hover:border-[var(--border-mid)]',
          'rounded-[var(--radius-sm)]',
        ].join(' '),
        ghost: [
          'text-[var(--fg-2)] bg-transparent',
          'hover:bg-[var(--surface-2)] hover:text-[var(--fg)]',
          'rounded-[var(--radius-sm)]',
        ].join(' '),
        link: 'text-[var(--accent)] underline-offset-4 hover:underline p-0 h-auto',
        accent: [
          'border border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-dim)]',
          'hover:bg-[var(--accent)] hover:text-[var(--bg)]',
          'rounded-[var(--radius-sm)]',
          'transition-all duration-150',
        ].join(' '),
      },
      size: {
        default: 'h-8 px-4 py-1.5 text-sm',
        sm:      'h-7 px-3 text-xs',
        lg:      'h-10 px-6 text-sm',
        icon:    'h-8 w-8',
        'icon-sm': 'h-7 w-7',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { buttonVariants }
