import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Card } from '../ui/card'
import { Icon, type IconName } from './Icon'

/** Empty state: what's missing, who fixes it, and the things the visitor can still do. */
export function EmptyState({
  icon = 'people',
  glyph,
  title,
  children,
  actions,
  className,
  headingLevel = 2,
}: {
  icon?: IconName
  glyph?: ReactNode
  title: string
  children?: ReactNode
  actions?: ReactNode
  className?: string
  headingLevel?: 2 | 3
}) {
  const H = headingLevel === 2 ? 'h2' : 'h3'
  return (
    <Card className={cn('flex flex-col items-start gap-4 p-6 md:p-12', className)}>
      <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-card border-2 border-dashed border-line2 text-muted">
        {glyph ?? <Icon name={icon} size={24} strokeWidth={1.4} />}
      </span>
      <H className="m-0 text-[22px] font-semibold leading-7">{title}</H>
      {children && <div className="max-w-[560px] text-ink2">{children}</div>}
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </Card>
  )
}

/** Error state: a plain sentence on what went wrong, what to do, and a retry. */
export function ErrorState({
  title,
  children,
  actions,
  compact = false,
  className,
}: {
  title: string
  children?: ReactNode
  actions?: ReactNode
  compact?: boolean
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3.5 rounded-card border border-amber-line bg-amber-bg',
        compact ? 'p-4' : 'p-6',
        className,
      )}
    >
      <Icon name="warn" size={compact ? 20 : 24} className="flex-none text-amber" />
      <div className="flex min-w-0 flex-col gap-2">
        <p className={cn('m-0 font-semibold', compact ? 'text-[15px]' : 'text-[17px]')}>{title}</p>
        {children && <div className="max-w-[640px] text-[14px] leading-[21px] text-ink2 md:text-[15px] md:leading-[22px]">{children}</div>}
        {actions && <div className="mt-1 flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  )
}

/** Amber inline notice (warnings, conflicts). */
export function Notice({ children, tone = 'amber', className, role }: { children: ReactNode; tone?: 'amber' | 'green' | 'blue'; className?: string; role?: 'alert' | 'status' }) {
  return (
    <div
      role={role}
      className={cn(
        'flex items-start gap-3 rounded-[12px] px-[18px] py-3.5 text-[14px] leading-[21px]',
        tone === 'amber' && 'border border-amber-line bg-amber-bg',
        tone === 'green' && 'bg-green-soft text-green',
        tone === 'blue' && 'border-2 border-sel bg-pri-soft',
        className,
      )}
    >
      {children}
    </div>
  )
}
