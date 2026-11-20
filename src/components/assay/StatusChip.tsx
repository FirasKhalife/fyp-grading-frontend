import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Icon, type IconName } from './Icon'

/** Status chips: always an icon and a word, never colour alone. */
export type StatusKind = 'notStarted' | 'draft' | 'submitted' | 'overdue' | 'waiting' | 'released' | 'releasedSoft' | 'final' | 'plain'

const STYLE: Record<StatusKind, { cls: string; icon: IconName | null; text?: string }> = {
  notStarted: { cls: 'border border-faint text-ink2 font-medium', icon: 'circle', text: 'Not started' },
  draft: { cls: 'border border-dashed border-pri bg-pri-soft text-pri', icon: 'pencil', text: 'Draft' },
  submitted: { cls: 'bg-green-soft text-green', icon: 'lock', text: 'Submitted' },
  overdue: { cls: 'bg-amber-soft text-amber', icon: 'clock', text: 'Overdue' },
  waiting: { cls: 'border border-faint text-ink2 font-medium', icon: 'half' },
  released: { cls: 'bg-green text-surface', icon: 'eye', text: 'Released' },
  releasedSoft: { cls: 'bg-green-soft text-green', icon: 'eye', text: 'Released' },
  final: { cls: 'bg-green-soft text-green', icon: 'check', text: 'Final' },
  plain: { cls: 'border border-line bg-surface text-ink2 font-medium', icon: null },
}

export function StatusChip({ kind, children, icon, className }: { kind: StatusKind; children?: ReactNode; icon?: IconName | null; className?: string }) {
  const s = STYLE[kind]
  const ic = icon === undefined ? s.icon : icon
  return (
    <span
      className={cn('inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[13px] font-semibold leading-none', s.cls, className)}
    >
      {ic && <Icon name={ic} size={14} />}
      {children ?? s.text}
    </span>
  )
}
