import { Accordion } from 'radix-ui'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { toast } from 'sonner'
import { ApiError } from '@/api/repository'
import { useTeamDetail, useTeamHistory, useTeamOps, useTeams } from '@/api/queries'
import type { TeamDetailView } from '@/api/views'
import { bandOf, LEVEL_NAMES } from '@/domain/levels'
import type { ActivityKind, ReviewerRole } from '@/domain/types'
import { cn, initials } from '@/lib/cn'
import { addMinutes, daysFromToday, fmtDayYear, fmtShort, fmtStamp, fmtTime } from '@/lib/demo-clock'
import { DISAGREEMENT_THRESHOLD, formatScore } from '@/lib/scoring'
import { Icon, type IconName } from '@/components/assay/Icon'
import { FILL, LevelMark, ScoreChip } from '@/components/assay/LevelMark'
import { Breadcrumb, Main, PageTitle, useTitle } from '@/components/assay/Page'
import { ErrorState } from '@/components/assay/States'
import { StatusChip } from '@/components/assay/StatusChip'
import { personaByUsername } from '@/auth/personas'
import { Button } from '@/components/ui/button'
import { Card, Skeleton } from '@/components/ui/card'
import { auditText } from '@/domain/audit'
import { NotFoundPage } from '../utility/UtilityPages'

const field =
  'min-h-11 w-full rounded-ctl border border-line2 bg-surface px-3 py-2.5 text-[15px] leading-[22px] text-ink placeholder:text-muted'

/** P6: one team, for the coordinator. */
export function TeamDetailPage() {
  const { teamId = '' } = useParams()
  const q = useTeamDetail(teamId)
  useTitle(q.data ? `Team ${q.data.team.name}` : 'Team')
  if (q.isPending)
    return (
      <Main>
        <div aria-busy="true" aria-label="Loading the team" className="flex flex-col gap-4">
          <Skeleton className="h-4 w-60" />
          <Skeleton className="h-11 w-72" />
          <Skeleton className="h-5 w-[min(560px,90%)]" />
          <div className="flex flex-wrap gap-6">
            <Card className="h-80 flex-[1_1_340px]" />
            <Card className="h-80 flex-[999_1_640px]" />
          </div>
        </div>
      </Main>
    )
  if (q.isError) {
    if (q.error instanceof ApiError && q.error.status === 404) return <NotFoundPage />
    return (
      <Main>
        <PageTitle>Team</PageTitle>
        <ErrorState title="We couldn't load this team." actions={<Button onClick={() => void q.refetch()}>Try again</Button>}>
          The server didn't respond. Your demo data is safe. Try again in a moment.
        </ErrorState>
      </Main>
    )
  }
  return <TeamDetail v={q.data} />
}

function TeamDetail({ v }: { v: TeamDetailView }) {
  const { team } = v
  const location = useLocation()
  const fromHash = location.hash.replace('#', '').toUpperCase()
  const initial = v.assessments.findIndex((a) => a.assessment.key === fromHash)
  const [open, setOpen] = useState<string[]>([`as-${initial >= 0 ? initial : 0}`])
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (initial >= 0) document.getElementById(`as-${initial}`)?.scrollIntoView({ block: 'start' })
  }, [initial])

  const missing = v.assessments.filter((a) => a.grade === null)
  return (
    <Main>
      <div className="flex flex-col gap-3.5">
        <Breadcrumb items={[{ label: 'Overview', to: '/overview' }, { label: 'Teams', to: '/teams' }, { label: `Team ${team.name}` }]} />
        {editing ? (
          <EditTeam v={v} onDone={() => setEditing(false)} />
        ) : (
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex max-w-[820px] flex-col gap-1.5">
              <PageTitle>Team {team.name}</PageTitle>
              <p className="m-0 text-[18px] font-medium leading-[27px]">{team.projectTitle || 'No project title yet'}</p>
              {team.description && <p className="m-0 text-ink2">{team.description}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => setEditing(true)}>
                <Icon name="pencil" />
                Edit team
              </Button>
              <Button asChild variant="ghost">
                <Link to={`/schedule?team=${team.id}`}>Set defense slot</Link>
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-4">
          <StudentsCard v={v} />
          <ReviewersCard v={v} />
          <Card as="section" aria-labelledby="df-h" className="flex flex-col gap-3 p-5">
            <h2 id="df-h" className="m-0 text-[16px] font-semibold">
              Defense
            </h2>
            {team.defense ? (
              <>
                <p className="m-0 font-semibold">
                  {fmtDayYear(team.defense.start)}, {fmtTime(team.defense.start)}–{fmtTime(addMinutes(team.defense.start, team.defense.minutes))} ·{' '}
                  {team.defense.room}
                </p>
                <p className="m-0 text-[14px] text-ink2">
                  Jury: {v.reviewers.filter((r) => r.role === 'JURY').map((r) => `${r.reviewer.firstName} ${r.reviewer.lastName}`).join(', ')}
                </p>
              </>
            ) : (
              <p className="m-0 text-[14px] text-ink2">No slot yet.</p>
            )}
            {v.conflicts.map((c, i) => {
              const other = c.teams.find((t) => t.id !== team.id)!
              return (
                <div key={i} role="alert" className="flex gap-2.5 rounded-ctl border border-amber-line bg-amber-bg p-3 text-[14px] leading-5">
                  <Icon name="warn" size={18} className="flex-none text-amber" />
                  <span>
                    <strong>Conflict:</strong> {c.reviewer.name} is also on Team {other.name}'s jury at {fmtTime(other.defense!.start)} in {other.defense!.room}.{' '}
                    <Link to="/schedule" className="font-semibold">
                      Fix in Schedule
                    </Link>
                  </span>
                </div>
              )
            })}
          </Card>
          <TeamHistory teamId={team.id} teamName={team.name} />
        </div>

        <section aria-labelledby="as-h" className="flex min-w-0 flex-[999_1_640px] flex-col gap-3">
          <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="flex flex-col gap-0.5">
              <h2 id="as-h" className="m-0 text-[18px] font-semibold">
                Final grade: {v.final !== null ? formatScore(v.final) : 'pending'}
              </h2>
              <p className="m-0 text-[14px] text-ink2">
                {v.final !== null
                  ? 'Computed from all five assessments, weighted 15/0/25/30/30.'
                  : `Needs ${missing.map((a) => `the ${a.assessment.name} (${a.submitted} of ${a.expected} submitted)`).join(' and ')}.`}
              </p>
            </div>
            {v.final !== null ? (
              <ScoreChip score={v.final} variant="band" />
            ) : (
              <StatusChip kind="waiting">
                {v.finalCount} of 5 assessments final
              </StatusChip>
            )}
          </Card>
          <Accordion.Root type="multiple" value={open} onValueChange={setOpen} className="flex flex-col gap-3">
            {v.assessments.map((a, i) => (
              <AssessmentRow key={a.assessment.key} a={a} i={i} teamName={team.name} />
            ))}
          </Accordion.Root>
        </section>
      </div>
    </Main>
  )
}

type Row = TeamDetailView['assessments'][number]

function AssessmentRow({ a, i, teamName }: { a: Row; i: number; teamName: string }) {
  const meta = [
    a.assessment.role === 'JURY' ? 'Jury' : 'Advisor',
    `${a.submitted} of ${a.expected} submitted`,
    a.release ? `released to students ${fmtShort(a.release.at)}` : a.grade !== null ? 'final, not released yet' : a.overdue ? `overdue since ${fmtShort(a.assessment.due)}` : `due ${fmtShort(a.assessment.due)}`,
    a.assessment.weight === 0 ? 'required for the final grade' : '',
  ]
    .filter(Boolean)
    .join(' · ')
  const subs = a.reviewers.filter((r) => r.state === 'SUBMITTED')
  const chip = a.release ? (
    <StatusChip kind="released" />
  ) : a.grade !== null ? (
    <StatusChip kind="final" />
  ) : a.overdue ? (
    <StatusChip kind="overdue" />
  ) : a.submitted > 0 ? (
    <StatusChip kind="waiting">
      {a.submitted} of {a.expected} submitted
    </StatusChip>
  ) : (
    <StatusChip kind="notStarted" />
  )
  const foot = a.release
    ? 'Comments are shown to the team as written.'
    : a.grade !== null
      ? 'Release it for all final teams from the Overview.'
      : a.reviewers.some((r) => r.state !== 'SUBMITTED')
        ? `The team grade is computed when ${a.reviewers.filter((r) => r.state !== 'SUBMITTED').map((r) => r.reviewer.name.split(' ')[0]).join(' and ')} submit${a.reviewers.filter((r) => r.state !== 'SUBMITTED').length === 1 ? 's' : ''}.`
        : ''
  const pending = a.reviewers.filter((r) => r.state !== 'SUBMITTED')

  return (
    <Accordion.Item value={`as-${i}`} asChild>
      <Card id={`as-${i}`} className="scroll-mt-6">
        <Accordion.Header asChild>
          <h3 className="m-0 text-[length:inherit] font-[inherit]">
            <Accordion.Trigger className="group flex min-h-[72px] w-full cursor-pointer flex-wrap items-center justify-between gap-4 rounded-card border-0 bg-transparent px-5 py-4 text-left text-ink hover:bg-raised">
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[17px] font-semibold">
                  {a.assessment.name} <span className="mono text-[14px] font-medium text-muted">{a.assessment.weight}%</span>
                </span>
                <span className="text-[13px] text-muted">{meta}</span>
              </span>
              <span className="flex flex-wrap items-center gap-2.5">
                {chip}
                {a.grade !== null && <ScoreChip score={a.grade} labelPrefix="Team grade" />}
                <Icon name="chevronDown" size={18} className="transition-transform group-data-[state=open]:rotate-180" />
              </span>
            </Accordion.Trigger>
          </h3>
        </Accordion.Header>
        <Accordion.Content className="flex flex-col gap-4 px-5 pb-5">
          <div className="flex flex-wrap gap-2">
            {a.reviewers.map((r) => (
              <StatusChip key={r.reviewer.id} kind={r.state === 'DRAFT' ? 'draft' : 'plain'} icon={r.state === 'DRAFT' ? 'pencil' : null}>
                {r.reviewer.name}{' '}
                <span className="mono font-semibold">{r.state === 'SUBMITTED' ? (r.score !== null ? formatScore(r.score) : 'submitted') : r.state === 'DRAFT' ? 'draft' : '—'}</span>
                {r.submittedLate && <span className="font-medium"> · late</span>}
              </StatusChip>
            ))}
          </div>
          {subs.length >= 2 && a.spread !== null && <Spread a={a} />}
          {subs.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[14px]">
                <caption className="sr-only">
                  {a.assessment.name}, Team {teamName}: level per criterion and reviewer
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className="px-2 py-2.5 text-left text-[13px] font-semibold text-muted">
                      Criterion
                    </th>
                    <th scope="col" className="px-2 py-2.5 text-left text-[13px] font-semibold text-muted">
                      Weight
                    </th>
                    {subs.map((r) => (
                      <th key={r.reviewer.id} scope="col" className="px-2 py-2.5 text-left text-[13px] font-semibold text-muted">
                        {r.reviewer.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {a.rubric.criteria.map((c) => {
                    const coms = subs.filter((r) => r.evaluation?.comments[c.id])
                    return (
                      <tr key={c.id}>
                        <th scope="row" className="min-w-[220px] border-t border-line px-2 py-2.5 text-left align-top font-medium">
                          <span className="flex flex-col gap-1 [overflow-wrap:anywhere]">
                            {c.name}
                            {coms.map((r) => (
                              <span key={r.reviewer.id} className="text-[13px] font-normal leading-[19px] text-muted">
                                {r.reviewer.name}: {r.evaluation!.comments[c.id]}
                              </span>
                            ))}
                          </span>
                        </th>
                        <td className="mono border-t border-line px-2 py-2.5 align-top">{c.weight}%</td>
                        {subs.map((r) => {
                          const l = r.evaluation?.levels[c.id] ?? null
                          return (
                            <td key={r.reviewer.id} className="border-t border-line px-2 py-2.5 align-top">
                              {l === null ? '—' : <LevelMark level={l} label={`${r.reviewer.name}: ${LEVEL_NAMES[l]}, level ${l}`} />}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {a.history.map((h) => (
            <div key={h.reviewer.id} className="flex flex-col gap-2">
              <p className="m-0 text-[14px] font-semibold">Draft history · {h.reviewer.name}</p>
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[14px]">
                {h.entries.map((e, k) => (
                  <li key={k} className="flex gap-3">
                    <span className="mono w-28 flex-none text-muted">{fmtStamp(e.at)}</span>
                    <span>{auditText(e)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {pending.length > 0 && (a.overdue || daysFromToday(a.assessment.due) <= 3) && (
            <Button
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() => toast.success(`Reminder sent to ${pending.map((p) => p.reviewer.name).join(' and ')}.`)}
            >
              Send {pending.length === 1 ? pending[0]!.reviewer.name.split(' ')[0] : 'them'} a reminder
            </Button>
          )}
          {foot && <p className="m-0 text-[13px] text-muted">{foot}</p>}
        </Accordion.Content>
      </Card>
    </Accordion.Item>
  )
}

function Spread({ a }: { a: Row }) {
  const subs = a.reviewers.filter((r) => r.state === 'SUBMITTED' && r.score !== null)
  const scores = subs.map((r) => r.score as number)
  const min = Math.min(...scores)
  const max = Math.max(...scores)
  const avg = scores.reduce((x, y) => x + y, 0) / scores.length
  const wide = a.disagreement
  return (
    <div className={cn('flex flex-col gap-1.5 rounded-[12px] border bg-paper p-3.5', wide ? 'border-amber-line' : 'border-line')}>
      <p className="m-0 flex items-center gap-1.5 text-[14px] font-semibold">
        {wide && <Icon name="swap" size={16} className="flex-none text-amber" />}
        <span>
          Reviewer spread: <span className="mono">{formatScore(a.spread ?? 0)}</span> points{' '}
          <span className={wide ? 'text-amber' : 'text-muted'}>
            · {wide ? `reviewers disagree (more than ${DISAGREEMENT_THRESHOLD} points apart)` : `within ${DISAGREEMENT_THRESHOLD} points`}
          </span>
        </span>
      </p>
      <div
        role="img"
        aria-label={`Scores on a 0 to 100 scale: ${subs.map((r) => `${r.reviewer.name} ${formatScore(r.score!)}`).join(', ')}. Team average ${formatScore(avg)}.`}
        className="relative mx-2 mt-1 h-11"
      >
        <span className="absolute inset-x-0 top-5 h-1 rounded-[2px] border border-line bg-raised" />
        <span className="absolute top-5 h-1 bg-amber-line" style={{ left: `${min}%`, width: `${max - min}%` }} />
        <span className="absolute top-2 -ml-px h-7 w-0.5 bg-ink" style={{ left: `${avg}%` }} />
        {subs.map((r) => (
          <span
            key={r.reviewer.id}
            className={cn('absolute top-3 -ml-2.5 flex size-5 items-center justify-center rounded-full border-2 border-surface text-[9px] font-bold', FILL[bandOf(r.score!)])}
            style={{ left: `${r.score}%` }}
          >
            {r.reviewer.initials}
          </span>
        ))}
      </div>
      <div aria-hidden="true" className="mono flex justify-between px-2 text-[11px] text-muted">
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>75</span>
        <span>100</span>
      </div>
      <p className="m-0 text-[13px] leading-[19px] text-muted">
        Informational only. The team grade is always the plain average ({formatScore(avg)}, the dark line).
      </p>
    </div>
  )
}

const HISTORY_ICON: Record<ActivityKind, IconName> = { submit: 'lock', edit: 'pencil', schedule: 'calendar', final: 'check', release: 'eye', assignment: 'people' }
const HISTORY_FIRST = 6

/** The team's history (contract `GET /api/activity?teamId=`): drafts, submissions, finals, releases, schedule and reviewer changes. */
function TeamHistory({ teamId, teamName }: { teamId: string; teamName: string }) {
  const q = useTeamHistory(teamId)
  const [all, setAll] = useState(false)
  const items = q.data ?? []
  const shown = all ? items : items.slice(0, HISTORY_FIRST)
  return (
    <Card as="section" aria-labelledby="hi-h" className="flex flex-col gap-2 p-5">
      <h2 id="hi-h" className="m-0 text-[16px] font-semibold">
        History {q.isSuccess && <span className="mono font-medium text-muted">{items.length}</span>}
      </h2>
      {q.isPending && (
        <div aria-busy="true" aria-label="Loading the history" className="flex flex-col gap-3 py-1">
          <Skeleton className="h-4 w-[90%]" />
          <Skeleton className="h-4 w-[75%]" />
          <Skeleton className="h-4 w-[82%]" />
        </div>
      )}
      {q.isError && (
        <ErrorState compact title="We couldn't load the history." actions={<Button size="sm" variant="ghost" onClick={() => void q.refetch()}>Try again</Button>}>
          The rest of the page is up to date.
        </ErrorState>
      )}
      {q.isSuccess && !items.length && <p className="m-0 text-[14px] text-ink2">Nothing has happened on Team {teamName} yet.</p>}
      {q.isSuccess && items.length > 0 && (
        <>
          <ul className="m-0 list-none p-0">
            {shown.map((e, i) => (
              <li key={e.id} className={cn('grid grid-cols-[28px_1fr] gap-2.5 py-2.5', i > 0 && 'border-t border-line')}>
                <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-[8px] bg-raised text-ink2">
                  <Icon name={HISTORY_ICON[e.kind]} size={14} />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[14px] leading-5 [overflow-wrap:anywhere]">
                    <strong className="font-semibold">{e.who}</strong> {e.text}
                  </span>
                  <span className="mono text-[12px] text-muted">{fmtStamp(e.at)}</span>
                </span>
              </li>
            ))}
          </ul>
          {items.length > HISTORY_FIRST && (
            <Button variant="ghost" size="sm" className="self-start" aria-expanded={all} onClick={() => setAll((x) => !x)}>
              {all ? 'Show fewer' : `Show all ${items.length}`}
            </Button>
          )}
        </>
      )}
    </Card>
  )
}

function StudentsCard({ v }: { v: TeamDetailView }) {
  const ops = useTeamOps()
  const [adding, setAdding] = useState(false)
  const [err, setErr] = useState('')
  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    try {
      await ops.mutateAsync({ op: 'addStudent', teamId: v.team.id, first: String(f.get('first')), last: String(f.get('last')), email: String(f.get('email')) })
      setAdding(false)
      setErr('')
      toast.success('Student added.')
    } catch (x) {
      setErr(x instanceof Error ? x.message : 'Could not add the student.')
    }
  }
  return (
    <Card as="section" aria-labelledby="st-h" className="flex flex-col gap-2 p-5">
      <div className="flex items-center justify-between">
        <h2 id="st-h" className="m-0 text-[16px] font-semibold">
          Students <span className="mono font-medium text-muted">{v.students.length}</span>
        </h2>
        {!adding && (
          <Button variant="ghost" size="sm" onClick={() => setAdding(true)}>
            <Icon name="plus" size={14} />
            Add student
          </Button>
        )}
      </div>
      {adding && (
        <form onSubmit={(e) => void add(e)} className="flex flex-col gap-2 rounded-[12px] border border-line bg-paper p-3" aria-label="Add a student">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
              First name
              <input name="first" required className={field} autoFocus />
            </label>
            <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
              Last name
              <input name="last" required className={field} />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
            Email
            <input name="email" type="email" required className={field} placeholder="name@usj.edu.lb" />
          </label>
          {err && (
            <p role="alert" className="m-0 text-[14px] text-amber">
              {err}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm">
              Add
            </Button>
            <Button variant="ghost" size="sm" onClick={() => (setAdding(false), setErr(''))}>
              Cancel
            </Button>
          </div>
        </form>
      )}
      <ul className="m-0 list-none p-0">
        {v.students.map((s) => (
          <li key={s.id} className="flex min-h-[52px] items-center justify-between gap-2.5 border-t border-line first:border-t-0">
            <span className="flex min-w-0 items-center gap-2.5">
              <span aria-hidden="true" className="flex size-8 flex-none items-center justify-center rounded-full bg-raised text-[12px] font-semibold text-ink2">
                {initials(`${s.firstName} ${s.lastName}`)}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="font-medium">
                  {s.firstName} {s.lastName}
                </span>
                <span className="truncate text-[13px] text-muted">{s.email}</span>
              </span>
            </span>
            {personaByUsername(s.email.split('@')[0]) ? (
              // The student personas always keep their team (409 `student-is-demo-persona`): no remove button.
              <StatusChip kind="plain">Demo persona</StatusChip>
            ) : (
              <button
                type="button"
                aria-label={`Remove ${s.firstName} ${s.lastName} from Team ${v.team.name}`}
                onClick={() =>
                  ops.mutateAsync({ op: 'removeStudent', teamId: v.team.id, studentId: s.id }).then(
                    () => toast.success(`${s.firstName} ${s.lastName} removed.`),
                    (x: unknown) => toast.error(x instanceof Error ? x.message : 'Could not remove.'),
                  )
                }
                className="flex size-11 flex-none cursor-pointer items-center justify-center rounded-ctl border-0 bg-transparent text-muted hover:bg-raised hover:text-ink"
              >
                <Icon name="x" />
              </button>
            )}
          </li>
        ))}
        {v.students.length === 0 && <li className="py-2 text-[14px] text-muted">No students yet.</li>}
      </ul>
    </Card>
  )
}

export function ReviewersCard({ v }: { v: Pick<TeamDetailView, 'team' | 'reviewers' | 'composition'> }) {
  const ops = useTeamOps()
  const all = useTeams()
  const [adding, setAdding] = useState(false)
  const [err, setErr] = useState('')
  /** Why a removal was refused (409 `reviewer-has-submissions` or `assessment-final`, 422 `composition-invalid`), shown in the card. */
  const [removeErr, setRemoveErr] = useState('')
  const free = (all.data?.reviewers ?? []).filter((r) => !v.reviewers.some((x) => x.reviewer.id === r.id))
  async function assign(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    try {
      await ops.mutateAsync({ op: 'assign', teamId: v.team.id, reviewerId: String(f.get('reviewer')), role: String(f.get('role')) as ReviewerRole })
      setAdding(false)
      setErr('')
      toast.success('Reviewer assigned. They were notified.')
    } catch (x) {
      setErr(x instanceof Error ? x.message : 'Could not assign.')
    }
  }
  const c = v.composition
  return (
    <Card as="section" aria-labelledby={`rv-h-${v.team.id}`} className="flex flex-col gap-2 p-5">
      <div className="flex items-center justify-between">
        <h2 id={`rv-h-${v.team.id}`} className="m-0 text-[16px] font-semibold">
          Reviewers<span className="sr-only"> of Team {v.team.name}</span>
        </h2>
        {!adding && c.total < 5 && (
          <Button variant="ghost" size="sm" onClick={() => setAdding(true)}>
            <Icon name="plus" size={14} />
            Assign reviewer
          </Button>
        )}
      </div>
      <p className={cn('m-0 flex items-center gap-2 text-[13px]', c.ok ? 'text-green' : 'text-amber')}>
        <Icon name={c.ok ? 'check' : 'warn'} size={14} />
        {c.text}
      </p>
      {adding && (
        <form onSubmit={(e) => void assign(e)} aria-label="Assign a reviewer" className="flex flex-col gap-2 rounded-[12px] border border-line bg-paper p-3">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
              Reviewer
              <select name="reviewer" required className={field}>
                {free.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.firstName} {r.lastName}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
              Role
              <select name="role" className={field} defaultValue={c.advisors < 1 ? 'ADVISOR' : 'JURY'}>
                <option value="JURY">Jury</option>
                <option value="ADVISOR">Advisor</option>
              </select>
            </label>
          </div>
          {err && (
            <p role="alert" className="m-0 text-[14px] text-amber">
              {err}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={!free.length}>
              Assign
            </Button>
            <Button variant="ghost" size="sm" onClick={() => (setAdding(false), setErr(''))}>
              Cancel
            </Button>
          </div>
        </form>
      )}
      <ul className="m-0 list-none p-0">
        {v.reviewers.map((r) => (
          <li key={r.reviewer.id} className="flex min-h-[52px] items-center justify-between gap-2.5 border-t border-line first:border-t-0">
            <span className="flex items-center gap-2.5">
              <span aria-hidden="true" className="flex size-8 flex-none items-center justify-center rounded-full bg-raised text-[12px] font-semibold text-ink2">
                {initials(`${r.reviewer.firstName} ${r.reviewer.lastName}`)}
              </span>
              <span className="font-medium">
                {r.reviewer.firstName} {r.reviewer.lastName}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <StatusChip kind="plain">{r.role === 'JURY' ? 'Jury' : 'Advisor'}</StatusChip>
              {'canRemove' in r && (
                <button
                  type="button"
                  aria-label={`Remove ${r.reviewer.firstName} ${r.reviewer.lastName} from Team ${v.team.name}`}
                  onClick={() =>
                    ops.mutateAsync({ op: 'unassign', teamId: v.team.id, reviewerId: r.reviewer.id }).then(
                      () => {
                        setRemoveErr('')
                        toast.success(`${r.reviewer.firstName} ${r.reviewer.lastName} removed from the team.`)
                      },
                      (x: unknown) => setRemoveErr(`${r.reviewer.firstName} ${r.reviewer.lastName} stays on the team. ${x instanceof Error ? x.message : ''}`.trim()),
                    )
                  }
                  className="flex size-11 flex-none cursor-pointer items-center justify-center rounded-ctl border-0 bg-transparent text-muted hover:bg-raised hover:text-ink"
                >
                  <Icon name="x" />
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
      {removeErr && (
        <p role="alert" className="m-0 flex gap-2 rounded-ctl border border-amber-line bg-amber-bg p-3 text-[14px] leading-5">
          <Icon name="warn" size={18} className="flex-none text-amber" />
          {removeErr}
        </p>
      )}
      <p className="m-0 text-[13px] leading-[19px] text-muted">Rules: 1 to 5 reviewers, at least 1 jury member and at least 1 advisor.</p>
    </Card>
  )
}

function EditTeam({ v, onDone }: { v: TeamDetailView; onDone: () => void }) {
  const ops = useTeamOps()
  const [err, setErr] = useState('')
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const name = String(f.get('name')).trim()
    const projectTitle = String(f.get('title')).trim()
    // The server refuses a blank name or title (400); an empty description clears it (contract 1.3.0).
    if (!name || !projectTitle) {
      setErr(!name ? 'Give the team a name.' : 'Give the project a title.')
      return
    }
    try {
      await ops.mutateAsync({ op: 'update', teamId: v.team.id, patch: { name, projectTitle, description: String(f.get('desc')).trim() } })
      toast.success('Team saved.')
      onDone()
    } catch (x) {
      setErr(x instanceof Error ? x.message : 'Could not save.')
    }
  }
  return (
    <form onSubmit={(e) => void save(e)} aria-label="Edit team" className="flex max-w-[820px] flex-col gap-3 rounded-card border border-line bg-surface p-5">
      <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
        Team name
        <input name="name" defaultValue={v.team.name} required className={field} autoFocus />
      </label>
      <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
        Project title
        <input name="title" defaultValue={v.team.projectTitle} required className={field} />
      </label>
      <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
        Short description
        <textarea name="desc" defaultValue={v.team.description} rows={3} className={field} />
      </label>
      {err && (
        <p role="alert" className="m-0 text-[14px] text-amber">
          {err}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit">Save team</Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
