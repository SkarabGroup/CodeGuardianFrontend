import { cn } from '@/lib/utils'

type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export function Input({ className, type, ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-8 w-full',
        'bg-[var(--surface)] border border-[var(--border-mid)]',
        'rounded-[var(--radius-sm)]',
        'px-3 py-1.5',
        'font-body text-sm text-[var(--fg)]',
        'placeholder:text-[var(--fg-3)] placeholder:font-light',
        'transition-colors duration-100',
        'focus:outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-2)]',
        'disabled:cursor-not-allowed disabled:opacity-40',
        'file:border-0 file:bg-transparent file:text-sm',
        className,
      )}
      {...props}
    />
  )
}
