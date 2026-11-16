import { Popover } from 'radix-ui'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useMoveDefense, useSchedule, useSetDue } from '@/api/queries'
import type { Conflict, ScheduleSlot, ScheduleView } from '@/api/views'
import { useViewer } from '@/auth/AuthProvider'
import type { Team } from '@/domain/types'
import { cn } from '@/lib/cn'
import { addMinutes, daysFromToday, fmtDay, fmtRelativeDays, fmtTime, parseLocal } from '@/lib/demo-clock'
import { Icon } from '@/components/assay/Icon'
import { Main, PageTitle, useTitle } from '@/components/assay/Page'
import { ErrorState } from '@/components/assay/States'
import { StatusChip } from '@/components/assay/StatusChip'
import { Button } from '@/components/ui/button'
import { Card, Skeleton } from '@/components/ui/card'

const HOUR_PX = 96
const FIRST_HOUR = 9
const LAST_HOUR = 17
const HOURS = Array.from({ length: LAST_HOUR - FIRST_HOUR }, (_, i) => FIRST_HOUR + i)
const ROOMS = ['Amphi A', 'Room B-204', 'Room C-110']
const field = 'min-h-11 rounded-ctl border border-line2 bg-surface px-3 text-[14px] text-ink'

/** P9: defenses (day or list) and due dates. Admin edits; reviewers and students see their own. */
export function SchedulePage() {
  useTitle('Schedule')
  const { persona } = useViewer()
  const q = useSchedule()
  const [view, setView] = useState<'day' | 'list'>('day')
  const isAdmin = persona.role === 'COORDINATOR'
  const lead =
    q.data?.scope === 'student'
      ? 'Your defense slot and the due date of each assessment.'
      : q.data?.scope === 'reviewer'
        ? 'Your defenses and the due date of each assessment. Only juries you sit on are shown.'
        : 'Defense days and the due date for each assessment. Reviewers see only their own defenses; students see their slot and timeline.'

  return (
    <Main className="gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <PageTitle>Schedule</PageTitle>
          <p className="m-0 text-ink2">{lead}</p>
        </div>
        {isAdmin && q.data && <AddSlot data={q.data} />}
      </div>
      {q.isPending && (
        <div aria-busy="true" aria-label="Loading the schedule" className="flex flex-wrap gap-6">
          <Card className="flex h-[480px] flex-[999_1_760px] flex-col gap-3 p-5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-full w-full" />
          </Card>
          <Card className="flex h-[480px] flex-[1_1_320px] flex-col gap-3 p-5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </Card>
        </div>
      )}
      {q.isError && (
        <ErrorState title="The schedule didn't load." actions={<Button onClick={() => void q.refetch()}>Try again</Button>}>
          The server didn't respond. Try again in a moment.
        </ErrorState>
      )}
      {q.isSuccess && (
        <>
          {isAdmin && <ConflictBanner data={q.data} />}
          {!isAdmin && q.data.conflicts.length > 0 && (
            <div role="alert" className="flex items-start gap-3 rounded-[12px] border border-amber-line bg-amber-bg px-[18px] py-3.5">
              <Icon name="warn" size={20} className="flex-none text-amber" />
              <span>
                <strong>You're on two juries at once</strong> ({q.data.conflicts[0]!.teams.map((t) => `Team ${t.name}`).join(' and ')},{' '}
                {fmtDay(q.data.conflicts[0]!.start)} at {fmtTime(q.data.conflicts[0]!.start)}). The coordinator has been told.
              </span>
            </div>
          )}
          <div className="flex flex-wrap items-start gap-6">
            <Card as="section" aria-labelledby="def-h" className="min-w-0 flex-[999_1_760px] overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <h2 id="def-h" className="m-0 text-[18px] font-semibold">
                  {q.data.scope === 'student' ? 'Your defense' : q.data.scope === 'reviewer' ? 'Your defenses' : 'Defenses'}
                </h2>
                <div role="group" aria-label="View" className="inline-flex gap-1 rounded-[12px] border border-line bg-raised p-1">
                  {(
                    [
                      ['day', 'Days'],
                      ['list', 'List'],
                    ] as const
                  ).map(([k, l]) => (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={view === k}
                      onClick={() => setView(k)}
                      className={cn(
                        'min-h-11 cursor-pointer rounded-[8px] border-0 bg-transparent px-3.5 text-[14px] font-medium text-ink2',
                        view === k && 'bg-surface font-semibold text-ink shadow-[0_1px_2px_rgba(0,0,0,0.12)]',
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              {q.data.slots.length === 0 ? (
                <p className="m-0 px-5 pb-5 text-ink2">No defenses scheduled for you yet. They appear here once the coordinator sets them.</p>
              ) : view === 'day' ? (
                <DayGrid data={q.data} editable={isAdmin} />
              ) : (
                <ListView slots={q.data.slots} />
              )}
            </Card>
            <DueDates data={q.data} editable={isAdmin} />
          </div>
        </>
      )}
    </Main>
  )
}

function hourOf(iso: string): number {
  const d = parseLocal(iso)
  return d.getHours() + d.getMinutes() / 60
}

function DayGrid({ data, editable }: { data: ScheduleView; editable: boolean }) {
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[640px] grid-cols-[64px_repeat(3,minmax(0,1fr))] border-t border-line">
        <div />
        {data.days.map((d) => {
          const n = daysFromToday(d)
          return (
            <div key={d} className="flex flex-col gap-0.5 border-l border-line p-3">
              <span className="font-semibold">{fmtDay(d)}</span>
              <span className="text-[13px] text-muted">{n === 0 ? 'Today' : n < 0 ? 'Day 1 · done' : 'Day 3'}</span>
            </div>
          )
        })}
        <div aria-hidden="true" className="relative" style={{ height: HOURS.length * HOUR_PX }}>
          {HOURS.map((h, i) => (
            <span key={h} className="mono absolute right-2 -translate-y-2 text-[12px] text-muted" style={{ top: i * HOUR_PX }}>
              {String(h).padStart(2, '0')}:00
            </span>
          ))}
        </div>
        {data.days.map((d) => {
          const slots = data.slots.filter((s) => s.slot.start.startsWith(d))
          return (
            <ul
              key={d}
              aria-label={fmtDay(d)}
              className="relative m-0 list-none border-l border-line p-0"
              style={{
                height: HOURS.length * HOUR_PX,
                backgroundImage: `repeating-linear-gradient(to bottom, var(--line) 0, var(--line) 1px, transparent 1px, transparent ${HOUR_PX}px)`,
              }}
            >
              {slots.map((s) => {
                const overlapping = slots.filter((o) => o !== s && Math.abs(hourOf(o.slot.start) - hourOf(s.slot.start)) < s.slot.minutes / 60)
                const half = overlapping.length > 0
                const idx = half ? slots.filter((o) => Math.abs(hourOf(o.slot.start) - hourOf(s.slot.start)) < s.slot.minutes / 60).indexOf(s) : 0
                const style = {
                  top: (hourOf(s.slot.start) - FIRST_HOUR) * HOUR_PX + 2,
                  height: s.conflict ? 88 : (s.slot.minutes / 60) * HOUR_PX,
                  left: half ? (idx === 0 ? 6 : 'calc(50% + 3px)') : 6,
                  width: half ? 'calc(50% - 9px)' : 'calc(100% - 12px)',
                }
                return (
                  <li key={s.team.id} className="absolute" style={style}>
                    <SlotCard s={s} editable={editable} />
                  </li>
                )
              })}
            </ul>
          )
        })}
      </div>
    </div>
  )
}

function SlotBody({ s }: { s: ScheduleSlot }) {
  return (
    <>
      <span className="mono font-semibold">
        {fmtTime(s.slot.start)}–{fmtTime(addMinutes(s.slot.start, s.slot.minutes))}
      </span>
      <span className="font-semibold">Team {s.team.name}</span>
      <span className="text-muted">
        {s.slot.room} · {s.jury.map((j) => j.initials).join(', ')}
      </span>
      {s.conflict && <span className="font-semibold text-amber">Conflict</span>}
      <span className="sr-only">. Jury: {s.jury.map((j) => j.name).join(', ')}</span>
    </>
  )
}

const slotCls = (s: ScheduleSlot) =>
  cn(
    'flex h-full w-full flex-col gap-0.5 overflow-hidden rounded-ctl border px-2.5 py-2 text-left text-[13px] leading-[18px] text-ink',
    s.done ? 'border-line2 bg-surface' : 'border-pri bg-pri-soft',
    s.conflict && 'border-2 border-amber-line bg-amber-bg',
  )

function SlotCard({ s, editable }: { s: ScheduleSlot; editable: boolean }) {
  if (!editable)
    return (
      <div className={slotCls(s)}>
        <SlotBody s={s} />
      </div>
    )
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button type="button" className={cn(slotCls(s), 'cursor-pointer hover:shadow-[0_0_0_2px_var(--pri)]')}>
          <SlotBody s={s} />
          <span className="sr-only">. Change the slot</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={6} collisionPadding={12} aria-label={`Change Team ${s.team.name}'s slot`} className="z-50 w-[300px] rounded-card border border-line bg-surface p-4 text-ink shadow-pop">
          <SlotForm team={s.team} start={s.slot.start} room={s.slot.room} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function SlotForm({ team, start, room, teams }: { team?: Team; start: string; room: string; teams?: Team[] }) {
  const move = useMoveDefense()
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const teamId = team?.id ?? String(f.get('team'))
    const iso = `${String(f.get('day'))}T${String(f.get('time'))}:00`
    try {
      await move.mutateAsync({ teamId, start: iso, room: String(f.get('room')) })
      toast.success('Slot saved. The team and its jury were notified.')
    } catch (x) {
      toast.error(x instanceof Error ? x.message : 'Could not save the slot.')
    }
  }
  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-2.5">
      <p className="m-0 font-semibold">{team ? `Team ${team.name}'s defense` : 'New defense slot'}</p>
      {!team && teams && (
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
          Team
          <select name="team" className={field}>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                Team {t.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
        Day
        <input name="day" type="date" defaultValue={start.slice(0, 10)} required className={cn(field, 'mono')} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
          Time
          <select name="time" defaultValue={fmtTime(start)} className={cn(field, 'mono')}>
            {HOURS.flatMap((h) => [`${String(h).padStart(2, '0')}:00`, `${String(h).padStart(2, '0')}:30`])
              .filter((t) => Number(t.slice(0, 2)) < LAST_HOUR)
              .map((t) => (
                <option key={t}>{t}</option>
              ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
          Room
          <select name="room" defaultValue={room} className={field}>
            {ROOMS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
      </div>
      <Button type="submit" disabled={move.isPending}>
        {move.isPending ? 'Saving…' : 'Save slot'}
      </Button>
    </form>
  )
}

function AddSlot({ data }: { data: ScheduleView }) {
  const unslotted = data.unslotted
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button>
          <Icon name="plus" />
          Add defense slot
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={6} collisionPadding={12} aria-label="Add defense slot" className="z-50 w-[300px] rounded-card border border-line bg-surface p-4 text-ink shadow-pop">
          {unslotted.length ? (
            <SlotForm teams={unslotted} start={`${data.days[2]}T14:00:00`} room="Amphi A" />
          ) : (
            <p className="m-0 text-[14px] leading-[21px]">Every team has a defense slot. Select a slot in the day view to move it.</p>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

/** Finds the first start time that day where the moved team's jury and room are free. */
function proposeFix(data: ScheduleView, c: Conflict): { team: Team; start: string; room: string } | null {
  const [, b] = c.teams
  const team = b!
  const slot = data.slots.find((s) => s.team.id === team.id)!
  const day = slot.slot.start.slice(0, 10)
  const jury = slot.jury.map((j) => j.id)
  for (let h = FIRST_HOUR; h < LAST_HOUR; h++) {
    const start = `${day}T${String(h).padStart(2, '0')}:00:00`
    if (start === slot.slot.start) continue
    const clash = data.slots.some(
      (o) =>
        o.team.id !== team.id &&
        o.slot.start.slice(0, 10) === day &&
        (o.slot.room === slot.slot.room
          ? Math.abs(hourOf(o.slot.start) - h) < o.slot.minutes / 60
          : // A shared jury member gets a full hour between their two defenses.
            o.jury.some((j) => jury.includes(j.id)) && Math.abs(hourOf(o.slot.start) - h) < 2),
    )
    // Same room: the fix only moves the time, as the banner says.
    if (!clash && hourOf(start) > hourOf(slot.slot.start)) return { team, start, room: slot.slot.room }
  }
  return null
}

function ConflictBanner({ data }: { data: ScheduleView }) {
  const move = useMoveDefense()
  const [fixed, setFixed] = useState<string | null>(null)
  const c = data.conflicts[0]
  if (!c)
    return fixed ? (
      <div role="status" className="flex items-center gap-2.5 rounded-[12px] bg-green-soft px-[18px] py-3.5 text-green">
        <Icon name="check" size={18} />
        <span>
          <strong>No conflicts.</strong> {fixed} The team and its jury were notified.
        </span>
      </div>
    ) : null
  const fix = proposeFix(data, c)
  const [a, b] = c.teams
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-amber-line bg-amber-bg px-[18px] py-3.5">
      <span className="flex items-start gap-3">
        <Icon name="warn" size={20} className="flex-none text-amber" />
        <span>
          <strong>
            {data.conflicts.length} conflict{data.conflicts.length > 1 ? 's' : ''}:
          </strong>{' '}
          {c.reviewer.name} is on two juries on {fmtDay(c.start)} at {fmtTime(c.start)} (Team {a!.name} in {a!.defense!.room}, Team {b!.name} in{' '}
          {b!.defense!.room}).
        </span>
      </span>
      {fix && (
        <Button
          variant="ghost"
          disabled={move.isPending}
          onClick={() =>
            void move.mutateAsync({ teamId: fix.team.id, start: fix.start, room: fix.room }).then(
              () => setFixed(`Team ${fix.team.name} moved to ${fmtTime(fix.start)}, still in ${fix.room}.`),
              (e: unknown) => toast.error(e instanceof Error ? e.message : "The slot didn't move. Try again."),
            )
          }
        >
          Move Team {fix.team.name} to {fmtTime(fix.start)}
        </Button>
      )}
    </div>
  )
}

function ListView({ slots }: { slots: ScheduleSlot[] }) {
  return (
    <div className="overflow-x-auto px-2 pb-2">
      <table className="w-full border-collapse text-[14px]">
        <caption className="sr-only">Defense slots</caption>
        <thead>
          <tr>
            {['Date', 'Time', 'Team', 'Room', 'Jury', 'Status'].map((h) => (
              <th key={h} scope="col" className="p-3 text-left text-[13px] text-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((s) => (
            <tr key={s.team.id}>
              <td className="border-t border-line p-3">{fmtDay(s.slot.start)}</td>
              <td className="mono border-t border-line p-3">{fmtTime(s.slot.start)}</td>
              <th scope="row" className="border-t border-line p-3 text-left font-semibold">
                Team {s.team.name}
              </th>
              <td className="border-t border-line p-3">{s.slot.room}</td>
              <td className="border-t border-line p-3">{s.jury.map((j) => j.name).join(', ')}</td>
              <td className="border-t border-line p-3">
                {s.conflict ? <StatusChip kind="overdue" icon="warn">Conflict</StatusChip> : s.done ? <StatusChip kind="submitted" icon="check">Done</StatusChip> : <StatusChip kind="plain">Scheduled</StatusChip>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DueDates({ data, editable }: { data: ScheduleView; editable: boolean }) {
  const setDue = useSetDue()
  return (
    <Card as="section" aria-labelledby="due-h" className="flex min-w-0 flex-[1_1_320px] flex-col gap-3.5 p-5">
      <h2 id="due-h" className="m-0 text-[18px] font-semibold">
        Due dates
      </h2>
      <p className="m-0 text-[13px] leading-[19px] text-muted">Same date for every team. Late submissions are allowed and marked overdue.</p>
      {data.dues.map((u) => {
        const n = daysFromToday(u.assessment.due)
        const state =
          n < 0
            ? `Passed · ${u.overdue ? `${u.overdue} overdue` : u.submitted === u.expected ? 'all submitted' : `${u.submitted} of ${u.expected} submitted`}`
            : `${fmtRelativeDays(u.assessment.due).replace(/^./, (c) => c.toUpperCase())} · ${u.submitted} of ${u.expected} submitted`
        const id = `due-${u.assessment.key}`
        return (
          <div key={u.assessment.key} className="flex flex-col gap-1.5 border-t border-line pt-3">
            <label htmlFor={id} className="flex justify-between gap-2 font-semibold">
              <span>{u.assessment.name}</span>
              <span className="mono font-medium text-muted">{u.assessment.weight}%</span>
            </label>
            {editable ? (
              <input
                id={id}
                type="date"
                value={u.assessment.due}
                onChange={(e) =>
                  e.target.value &&
                  setDue.mutate(
                    { a: u.assessment.key, date: e.target.value },
                    { onSuccess: () => toast.success(`${u.assessment.name} is now due ${fmtDay(e.target.value)}.`) },
                  )
                }
                className={cn(field, 'mono')}
              />
            ) : (
              <output id={id} className="mono text-[14px]">
                {fmtDay(u.assessment.due)}
              </output>
            )}
            {editable && (
              <StatusChip kind={u.overdue && n < 0 ? 'overdue' : 'plain'} icon={u.overdue && n < 0 ? 'clock' : null} className="self-start">
                {state}
              </StatusChip>
            )}
          </div>
        )
      })}
    </Card>
  )
}
