import { Popover } from 'radix-ui'
import { useState } from 'react'
import { Link } from 'react-router'
import { useMarkRead, useNotifications } from '@/api/queries'
import type { NotificationKind } from '@/domain/types'
import { cn } from '@/lib/cn'
import { daysFromToday, fmtStamp } from '@/lib/demo-clock'
import { Icon, type IconName } from '../assay/Icon'
import { Skeleton } from '../ui/card'

const KIND_ICON: Record<NotificationKind, IconName> = {
  due: 'clock',
  schedule: 'calendar',
  final: 'check',
  team: 'people',
  release: 'eye',
}

/** P10: bell with an unread count, and a panel of items that link to the right place. */
export function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const q = useNotifications()
  const mark = useMarkRead()
  const unread = q.data?.unread ?? 0
  const items = q.data?.items ?? []
  const groups = [
    { n: 'Today', items: items.filter((i) => daysFromToday(i.at) === 0) },
    { n: 'Earlier', items: items.filter((i) => daysFromToday(i.at) !== 0) },
  ].filter((g) => g.items.length)

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`Notifications, ${unread ? `${unread} unread` : 'none unread'}`}
          className={cn(
            'relative inline-flex size-11 flex-none cursor-pointer items-center justify-center rounded-ctl border border-line bg-surface text-ink',
            open && 'border-pri bg-pri-soft',
          )}
        >
          <Icon name="bell" size={18} />
          {unread > 0 && (
            <span
              aria-hidden="true"
              className="absolute right-[3px] top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-pri px-1 text-[11px] font-semibold leading-none text-on-pri"
            >
              {unread}
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={10}
          collisionPadding={12}
          aria-label="Notifications"
          className="z-50 max-h-[min(720px,calc(100vh-96px))] w-[min(440px,calc(100vw-24px))] overflow-auto rounded-card border border-line bg-surface text-ink shadow-pop"
        >
          <div className="flex items-center justify-between py-2 pl-4 pr-2 pt-3">
            <h2 className="m-0 text-[16px] font-semibold">
              Notifications <span className="mono font-medium text-muted">{unread ? `${unread} unread` : 'all read'}</span>
            </h2>
            <button
              type="button"
              onClick={() => mark.mutate('all')}
              disabled={!unread}
              className="inline-flex min-h-11 cursor-pointer items-center rounded-[8px] px-2.5 text-[14px] font-semibold text-pri hover:bg-pri-soft disabled:cursor-default disabled:text-muted disabled:hover:bg-transparent"
            >
              Mark all as read
            </button>
          </div>
          <p aria-live="polite" className="m-0 flex items-center gap-1.5 px-4 pb-2 text-[12px] text-muted">
            <span aria-hidden="true" className="size-2 rounded-full bg-green" />
            Live · new items appear here without reloading
          </p>
          {q.isPending && (
            <div className="flex flex-col gap-3 p-4" aria-busy="true" aria-label="Loading notifications">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-2/3" />
            </div>
          )}
          {q.isError && (
            <p className="m-0 px-4 pb-4 text-[14px] text-ink2">
              Notifications didn't load.{' '}
              <button type="button" className="cursor-pointer font-semibold text-pri underline" onClick={() => void q.refetch()}>
                Try again
              </button>
            </p>
          )}
          {q.isSuccess && !items.length && (
            <p className="m-0 p-4 text-muted">No notifications yet. You'll hear about due dates, grades that become final, and defense changes.</p>
          )}
          {groups.map((g) => (
            <div key={g.n}>
              <div className="border-t border-line px-4 pb-1.5 pt-2.5 text-[12px] font-semibold text-muted">{g.n}</div>
              <ul className="m-0 list-none p-0">
                {g.items.map((it) => (
                  <li
                    key={it.id}
                    className={cn('relative grid grid-cols-[32px_1fr_auto] items-start gap-3 border-t border-line px-4 py-3.5', !it.read && 'bg-pri-soft')}
                  >
                    {!it.read && <span aria-hidden="true" className="absolute left-1.5 top-7 size-2 rounded-full bg-pri" />}
                    <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-[8px] bg-raised text-ink2">
                      <Icon name={KIND_ICON[it.kind]} />
                    </span>
                    <Link
                      to={it.href}
                      onClick={() => {
                        if (!it.read) mark.mutate(it.id)
                        setOpen(false)
                      }}
                      className="group flex min-h-11 flex-col gap-0.5 text-ink no-underline hover:text-ink"
                    >
                      <span className={cn('text-[14px] leading-5 group-hover:underline', !it.read && 'font-semibold')}>{it.text}</span>
                      <span className="mono text-[12px] text-muted">
                        {fmtStamp(it.at)}
                        {!it.read && ' · unread'}
                      </span>
                    </Link>
                    {!it.read ? (
                      <button
                        type="button"
                        aria-label={`Mark as read: ${it.text}`}
                        onClick={() => mark.mutate(it.id)}
                        className="flex size-11 cursor-pointer items-center justify-center rounded-ctl text-muted hover:bg-surface hover:text-pri"
                      >
                        <Icon name="check" />
                      </button>
                    ) : (
                      <span className="size-11" />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
