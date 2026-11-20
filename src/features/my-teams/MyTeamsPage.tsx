import { useState } from 'react'
import { Link } from 'react-router'
import { useMyTeams } from '@/api/queries'
import type { MyEvalRow, MyTeamCard } from '@/api/views'
import { useViewer } from '@/auth/AuthProvider'
import { assessmentSlug, ROLE_LABEL } from '@/domain/assessments'
import { cn } from '@/lib/cn'
import { daysFromToday, fmtDay, fmtRelativeDays, fmtShort, fmtTime } from '@/lib/demo-clock'
import { Icon } from '@/components/assay/Icon'
import { ScoreChip } from '@/components/assay/LevelMark'
import { Main, PageTitle, useTitle } from '@/components/assay/Page'
import { EmptyState, ErrorState } from '@/components/assay/States'
import { StatusChip } from '@/components/assay/StatusChip'
import { Button } from '@/components/ui/button'
import { Card, Skeleton } from '@/components/ui/card'
import { weightLabel } from '@/lib/weight'

type Filter = 'all' | 'todo' | 'done'

/** P3: "What do I need to grade, and by when?" Jury sees 4 assessments per team, an advisor 1. */
export function MyTeamsPage() {
  const { persona } = useViewer()
  const title = persona.role === 'COORDINATOR' ? 'My grading' : 'My teams'
  useTitle(title)
  const q = useMyTeams()
  const [filter, setFilter] = useState<Filter>('all')

  if (q.isPending) return <MyTeamsSkeleton title={title} />
  if (q.isError)
    return (
      <Main>
        <PageTitle>{title}</PageTitle>
        <ErrorState
          title="We couldn't load your teams."
          actions={
            <>
              <Button onClick={() => void q.refetch()}>Try again</Button>
              <Button asChild variant="ghost">
                <Link to="/">Back to roles</Link>
              </Button>
            </>
          }
        >
          The server didn't respond. Your drafts are saved and nothing was lost. Try again; if it keeps happening, the demo may be restarting, so
          wait a minute.
        </ErrorState>
      </Main>
    )

  const { cards, summary, nextUp } = q.data
  if (!cards.length)
    return (
      <Main>
        <PageTitle>{title}</PageTitle>
        <EmptyState
          title="You're not assigned to any team yet"
          actions={
            <>
              <Button asChild variant="ghost">
                <Link to="/rubrics">Read the rubrics</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/schedule">See the schedule</Link>
              </Button>
            </>
          }
        >
          The coordinator assigns reviewers to teams. Once you're on a team, its assessments and due dates appear here.
        </EmptyState>
      </Main>
    )

  const todoCount = cards.filter((c) => c.rows.some((r) => r.state !== 'SUBMITTED')).length
  const shown = cards
    .map((c) => ({ ...c, rows: c.rows.filter((r) => filter === 'all' || (filter === 'todo' ? r.state !== 'SUBMITTED' : r.state === 'SUBMITTED')) }))
    .filter((c) => c.rows.length)
  const pct = summary.expected ? Math.round((summary.submitted / summary.expected) * 100) : 0
  const parts = [
    summary.drafts ? `${summary.drafts} draft${summary.drafts > 1 ? 's' : ''}` : null,
    summary.notStarted ? `${summary.notStarted} not started` : null,
    summary.overdue ? `${summary.overdue} overdue` : 'none overdue',
  ].filter(Boolean)

  return (
    <Main>
      <div className="flex flex-wrap items-stretch gap-6">
        <div className="flex min-w-0 flex-[999_1_520px] flex-col justify-center gap-3">
          <PageTitle>{title}</PageTitle>
          <p className="m-0 text-[17px] leading-[26px] text-ink2">
            <strong className="mono">
              {summary.submitted} of {summary.expected}
            </strong>{' '}
            evaluations submitted · {parts.join(' · ')}
          </p>
          <div
            role="progressbar"
            aria-label="Evaluations submitted"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2 max-w-[520px] overflow-hidden rounded-[4px] border border-line bg-raised"
          >
            <span className="block h-full bg-pri" style={{ width: `${pct}%` }} />
          </div>
        </div>
        {nextUp && <NextUp team={nextUp.team.name} teamId={nextUp.team.id} row={nextUp.row} />}
      </div>

      <div role="group" aria-label="Filter evaluations" className="inline-flex gap-1 self-start rounded-[12px] border border-line bg-raised p-1">
        {(
          [
            ['all', `All teams ${cards.length}`],
            ['todo', `To do ${todoCount}`],
            ['done', `Submitted ${summary.submitted}`],
          ] as [Filter, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            aria-pressed={filter === k}
            onClick={() => setFilter(k)}
            className={cn(
              'inline-flex min-h-11 cursor-pointer items-center rounded-[8px] border-0 bg-transparent px-3 text-[14px] font-medium text-ink2',
              filter === k && 'bg-surface font-semibold text-ink shadow-[0_1px_2px_rgba(0,0,0,0.12)]',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {shown.length === 0 && <p className="m-0 text-muted">Nothing here: {filter === 'todo' ? 'everything is submitted.' : 'nothing submitted yet.'}</p>}
      {shown.map((c) => (
        <TeamCard key={`${c.team.id}-${c.role}`} card={c} />
      ))}
    </Main>
  )
}

function NextUp({ team, teamId, row }: { team: string; teamId: string; row: MyEvalRow }) {
  const due = daysFromToday(row.assessment.due)
  return (
    <Card as="section" aria-labelledby="next-h" className="flex min-w-0 flex-[1_1_380px] flex-col gap-2.5 border-2 border-pri p-5">
      <span id="next-h" className="text-[13px] font-semibold text-muted">
        Next up
      </span>
      <p className="m-0 text-[18px] font-semibold leading-[26px]">
        {row.assessment.name} · Team {team}
      </p>
      <p className={cn('m-0 text-[14px]', row.overdue ? 'text-amber' : 'text-ink2')}>
        {row.overdue ? `Overdue since ${fmtDay(row.assessment.due)}` : `Due ${fmtDay(row.assessment.due)}, ${fmtRelativeDays(row.assessment.due)}`}
        {row.state === 'DRAFT' && ` · ${row.scored} of ${row.total} criteria scored`}
        {row.state === 'NOT_STARTED' && due >= 0 && ' · not started'}
      </p>
      <Button asChild className="self-start">
        <Link to={`/grade/${teamId}/${assessmentSlug(row.assessment.key)}`}>
          {row.state === 'DRAFT' ? 'Continue draft' : 'Start grading'}
          <Icon name="arrowRight" />
        </Link>
      </Button>
    </Card>
  )
}

function defenseText(start: string): string {
  const d = daysFromToday(start)
  if (d === 0) return `Defended today, ${fmtTime(start)}`
  if (d < 0) return `Defended ${fmtDay(start)}`
  return `Defense ${fmtDay(start)}, ${fmtTime(start)}`
}

function TeamCard({ card }: { card: MyTeamCard }) {
  const { team, rows, role } = card
  const todo = card.rows.length - card.rows.filter((r) => r.state === 'SUBMITTED').length
  const allRows = card.rows
  const totalTodo = allRows.filter((r) => r.state !== 'SUBMITTED').length
  const id = `team-${team.id}-${role}`
  return (
    <Card as="section" aria-labelledby={id}>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 border-b border-line p-4 md:px-6 md:py-5">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={id} className="m-0 text-[20px] font-semibold leading-7">
            Team {team.name}
          </h2>
          <p className="m-0 text-ink2">{team.projectTitle}</p>
          <p className="m-0 text-[13px] text-muted">
            Advisor {card.advisors.map((p) => p.name).join(', ') || '—'} · Jury {card.jury.map((p) => p.name).join(', ') || '—'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip kind="plain">Your role: {ROLE_LABEL[role]}</StatusChip>
          {team.defense && (
            <StatusChip kind="plain" icon="calendar">
              {defenseText(team.defense.start)} · {team.defense.room}
            </StatusChip>
          )}
          {totalTodo === 0 ? (
            <StatusChip kind="submitted">{allRows.length === 1 ? 'Submitted' : `All ${allRows.length} submitted`}</StatusChip>
          ) : allRows.some((r) => r.overdue) ? (
            <StatusChip kind="overdue">{totalTodo} to do · overdue</StatusChip>
          ) : (
            <StatusChip kind="draft" icon="pencil">
              {totalTodo} to do
            </StatusChip>
          )}
        </div>
      </div>
      <div className="px-4 pb-2 pt-1 md:px-6">
        <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1.6fr)_190px_210px_120px_180px] gap-4 pb-2 pt-3 text-[13px] font-semibold text-muted lg:grid">
          <span>Assessment</span>
          <span>Status</span>
          <span>Due</span>
          <span>My score</span>
          <span />
        </div>
        <ul className="m-0 list-none p-0">
          {rows.map((r) => (
            <EvalRow key={r.assessment.key} teamId={team.id} teamName={team.name} row={r} defense={team.defense?.start ?? null} />
          ))}
        </ul>
        {todo === 0 && rows.length === 0 && <p className="text-muted">Nothing to show.</p>}
      </div>
    </Card>
  )
}

function EvalRow({ teamId, teamName, row, defense }: { teamId: string; teamName: string; row: MyEvalRow; defense: string | null }) {
  const a = row.assessment
  const href = `/grade/${teamId}/${assessmentSlug(a.key)}`
  let due = `Due ${fmtShort(a.due)}`
  if (row.state !== 'SUBMITTED') {
    due = row.overdue ? `Was due ${fmtDay(a.due)}` : `Due ${fmtDay(a.due)} · ${fmtRelativeDays(a.due)}`
    if (a.key === 'FINAL_PRESENTATION' && defense && daysFromToday(defense) > 0) due = `Due ${fmtDay(a.due)} · defense ${fmtDay(defense).split(' ')[0]}`
  }
  const btn = row.state === 'SUBMITTED' ? 'View' : row.state === 'DRAFT' ? 'Continue draft' : 'Start grading'
  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 border-t border-line py-4 first:border-t-0 lg:grid-cols-[minmax(0,1.6fr)_190px_210px_120px_180px] lg:gap-4 lg:py-3.5">
      <span className="col-span-2 flex min-w-0 flex-col gap-0.5 lg:col-span-1">
        <span className="font-semibold">{a.name}</span>
        <span className="mono text-[12px] text-muted">{weightLabel(a.weight)}</span>
      </span>
      <span>
        {row.state === 'SUBMITTED' && (row.submittedLate ? <StatusChip kind="overdue" icon="lock">Submitted late</StatusChip> : <StatusChip kind="submitted" />)}
        {row.state === 'DRAFT' && (
          <StatusChip kind={row.overdue ? 'overdue' : 'draft'} icon={row.overdue ? 'clock' : 'pencil'}>
            {row.overdue ? 'Overdue' : 'Draft'} · {row.scored} of {row.total} scored
          </StatusChip>
        )}
        {row.state === 'NOT_STARTED' && (row.overdue ? <StatusChip kind="overdue">Overdue · not started</StatusChip> : <StatusChip kind="notStarted" />)}
      </span>
      <span className={cn('order-3 col-span-2 text-[14px] lg:order-none lg:col-span-1', row.overdue ? 'font-semibold text-amber' : 'text-ink2')}>{due}</span>
      <span className="justify-self-end lg:justify-self-start">
        {row.score !== null ? <ScoreChip score={row.score} labelPrefix="My score" /> : <span className="hidden text-muted lg:inline">—</span>}
      </span>
      <span className="order-4 col-span-2 flex justify-end lg:order-none lg:col-span-1">
        <Button asChild variant={row.state === 'SUBMITTED' ? 'ghost' : 'primary'} className="w-full sm:w-auto">
          <Link to={href} aria-label={`${btn}: ${a.name}, Team ${teamName}`}>
            {btn}
          </Link>
        </Button>
      </span>
    </li>
  )
}

function MyTeamsSkeleton({ title }: { title: string }) {
  return (
    <Main>
      <div aria-busy="true" aria-label="Loading your teams" className="flex flex-col gap-5">
        <div className="flex flex-wrap gap-6">
          <div className="flex flex-1 flex-col justify-center gap-3">
            <PageTitle>{title}</PageTitle>
            <Skeleton className="h-[18px] w-[min(420px,90%)]" />
            <Skeleton className="h-2 w-[min(520px,95%)]" />
          </div>
          <Card className="flex w-[380px] max-w-full flex-col gap-2.5 p-5">
            <Skeleton className="h-3 w-[60px]" />
            <Skeleton className="h-5 w-[220px]" />
            <Skeleton className="h-3.5 w-[260px]" />
            <Skeleton className="h-11 w-40 rounded-ctl" />
          </Card>
        </div>
        <Card>
          <div className="flex flex-col gap-2 border-b border-line px-6 py-5">
            <Skeleton className="h-[22px] w-40" />
            <Skeleton className="h-3.5 w-[min(380px,80%)]" />
          </div>
          <div className="px-6 pb-2 pt-1">
            {[70, 55, 45, 60].map((w, i) => (
              <div key={i} className={cn('grid grid-cols-[1fr_auto] items-center gap-4 py-3.5 lg:grid-cols-[minmax(0,1.6fr)_190px_210px_120px_180px]', i > 0 && 'border-t border-line')}>
                <Skeleton className="h-4" style={{ width: `${w}%` }} />
                <Skeleton className="h-[26px] w-[110px] rounded-full" />
                <Skeleton className="hidden h-3.5 w-[120px] lg:block" />
                <Skeleton className="hidden h-7 w-[70px] lg:block" />
                <Skeleton className="hidden h-11 w-[120px] justify-self-end rounded-ctl lg:block" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Main>
  )
}
