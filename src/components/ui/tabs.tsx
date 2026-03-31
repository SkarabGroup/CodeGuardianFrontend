import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/lib/utils'

export const Tabs = TabsPrimitive.Root

export function TabsList({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        'flex items-center gap-0',
        'border-b border-[var(--border)]',
        className,
      )}
      {...props}
    />
  )
}

export function TabsTrigger({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'relative flex items-center gap-1.5 px-4 py-2.5',
        'font-body text-xs font-medium tracking-wide',
        'text-[var(--fg-3)] transition-colors duration-100',
        'border-b-[2px] border-b-transparent -mb-px',
        'hover:text-[var(--fg-2)]',
        'focus-visible:outline-none',
        'disabled:pointer-events-none disabled:opacity-30',
        'data-[state=active]:text-[var(--accent)] data-[state=active]:border-b-[var(--accent)]',
        className,
      )}
      {...props}
    />
  )
}

export function TabsContent({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn('mt-5 focus-visible:outline-none', className)}
      {...props}
    />
  )
}
