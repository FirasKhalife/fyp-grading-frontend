import { lazy, Suspense, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { useOverview, useRelease, useResetDemo } from '@/api/queries'
import type { GridRow, OverviewView, ReleaseCandidate } from '@/api/views'
import { useAuth } from '@/auth/AuthProvider'
import { ASSESSMENTS } from '@/domain/assessments'
import { bandOf } from '@/domain/levels'
import type { ActivityKind, Assessment, AssessmentKey } from '@/domain/types'
import { cn, joinNames } from '@/lib/cn'
import { fmtLong, fmtStamp, isoDay, sessionLabel } from '@/lib/demo-clock'
import { formatScore } from '@/lib/scoring'
import { Glyph } from '@/components/assay/Wordmark'
import { Icon, type IconName } from '@/components/assay/Icon'
import { LevelMark } from '@/components/assay/LevelMark'
import { Main, PageTitle, useTitle } from '@/components/assay/Page'
import { EmptyState, ErrorState } from '@/components/assay/States'
import { Button } from '@/components/ui/button'
import { Card, Skeleton } from '@/components/ui/card'
import { repository } from '@/api/repository'
import { GradeGrid } from './GradeGrid'

// The chart library is large: load the insights after the grid.
const Insights = lazy(() => import('./Insights').then((m) => ({ default: m.Insights })))

type Filter = 'all' | 'attention' | 'final'
type Sort = 'name' | 'final' | 'pending'

/** P5: "Where are we, and what's blocked?" */
export function OverviewPage() {
  useTitle('Overview')
  const q = useOverview()
  return (
    <Main>
      <Header data={q.data} />
      {q.isPending && <OverviewSkeleton />}
      {q.isError && <OverviewError onRetry={() => void q.refetch()} />}
      {q.isSuccess && (q.data.rows.length ? <OverviewBody data={q.data} /> : <OverviewEmpty />)}
    </Main>
  )
}

function Header({ data }: { data?: OverviewView }) {
  const today = isoDay(0)
  const defenseDays = [-1, 0, 1].map((d) => isoDay(d))
  const dayIdx = defenseDays.indexOf(today)
  const upcoming = ASSESSMENTS.filter((a) => a.dueOffset >= 0)
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        <span className="mono text-[13px] text-muted">
          {sessionLabel()} session{data ? ` · ${data.teamCount} teams · ${data.reviewerCount} reviewers` : ''}
        </span>
        <PageTitle>Overview</PageTitle>
        <p className="m-0 text-ink2">
          {fmtLong(today)}
          {dayIdx >= 0 && ` · defense day ${dayIdx + 1} of 3`}.{' '}
          {upcoming.length > 0 &&
            `${joinNames(upcoming.map((a) => a.name))} grades are due ${fmtLong(isoDay(upcoming[0]!.dueOffset))}.`.replace(/^./, (c) => c.toUpperCase())}
        </p>
      </div>
      {data && data.rows.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => void exportCsv()}>
            <Icon name="download" />
            Export CSV
          </Button>
          <Button asChild variant="ghost">
            <Link to="/schedule">Schedule</Link>
          </Button>
        </div>
      )}
    </div>
  )
}

function Kpis({ k }: { k: OverviewView['kpis'] }) {
  const pct = k.expected ? Math.round((k.submitted / k.expected) * 100) : 0
  const rel = k.releasable ? Math.round((k.released / k.releasable) * 100) : 0
  return (
    <section aria-label="Key figures" className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
      <Kpi label="Evaluations submitted" value={<>{k.submitted} <span className="text-[18px] text-muted">/ {k.expected}</span></>} meter={pct} foot={`${pct}% · ${k.expected - k.submitted} still to come`} />
      <Kpi
        label="Overdue"
        tone={k.overdue.count ? 'amber' : undefined}
        value={k.overdue.count}
        foot={
          k.overdue.count ? (
            <span className="flex items-center gap-1.5 text-amber">
              <Icon name="clock" size={14} />
              {k.overdue.label}
            </span>
          ) : (
            'Nothing overdue'
          )
        }
      />
      <Kpi label="Final grades computed" value={<>{k.finals.count} <span className="text-[18px] text-muted">/ {k.teamCount}</span></>} foot={k.finals.names.join(', ') || 'None yet'} />
      <Kpi label="Results released" value={<>{k.released} <span className="text-[18px] text-muted">/ {k.releasable}</span></>} meter={rel} foot={k.readyToRelease ? `${k.readyToRelease} final and ready to release` : 'team × assessment results'} />
      <Kpi
        label="Average final grade"
        value={
          k.average !== null ? (
            <span className="flex items-center gap-2.5">
              {formatScore(k.average)}
              <LevelMark level={bandOf(k.average)} />
            </span>
          ) : (
            '—'
          )
        }
        foot={k.finals.count ? `${k.finals.count} team${k.finals.count > 1 ? 's' : ''} so far` : 'No final grade yet'}
      />
    </section>
  )
}

function Kpi({ label, value, foot, meter, tone }: { label: string; value: React.ReactNode; foot: React.ReactNode; meter?: number; tone?: 'amber' }) {
  return (
    <Card className={cn('flex min-w-0 flex-col gap-2 p-5', tone === 'amber' && 'border-amber-line')}>
      <span className="text-[14px] font-medium text-ink2">{label}</span>
      <span className={cn('mono text-[30px] font-semibold leading-9', tone === 'amber' && 'text-amber')}>{value}</span>
      {meter !== undefined && (
        <div aria-hidden="true" className="h-2 overflow-hidden rounded-[4px] border border-line bg-raised">
          <span className="block h-full bg-pri" style={{ width: `${meter}%` }} />
        </div>
      )}
      <span className="text-[13px] text-muted">{foot}</span>
    </Card>
  )
}

function OverviewBody({ data }: { data: OverviewView }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('name')
  const cols: Assessment[] = data.rows[0]!.cells.map((c) => c.assessment)
  let rows: GridRow[] = data.rows
  if (filter === 'attention') rows = rows.filter((r) => r.attention)
  if (filter === 'final') rows = rows.filter((r) => r.final !== null)
  const pending = (r: GridRow) => r.cells.reduce((s, c) => s + (c.expected - c.submitted), 0)
  rows = [...rows].sort((a, b) =>
    sort === 'final'
      ? (b.final ?? -1) - (a.final ?? -1) || a.team.name.localeCompare(b.team.name)
      : sort === 'pending'
        ? pending(b) - pending(a) || a.team.name.localeCompare(b.team.name)
        : a.team.name.localeCompare(b.team.name),
  )
  const filters: [Filter, string][] = [
    ['all', `All ${data.rows.length}`],
    ['attention', `Needs attention ${data.rows.filter((r) => r.attention).length}`],
    ['final', `Final grade ${data.rows.filter((r) => r.final !== null).length}`],
  ]
  return (
    <>
      <Kpis k={data.kpis} />
      <div className="flex flex-wrap items-start gap-6">
        <Card as="section" aria-labelledby="grid-h" className="flex min-w-0 flex-[999_1_760px] flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="grid-h" className="m-0 text-[18px] font-semibold">
              Teams × assessments
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <div role="group" aria-label="Filter teams" className="inline-flex gap-1 rounded-[12px] border border-line bg-raised p-1">
                {filters.map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={filter === k}
                    onClick={() => setFilter(k)}
                    className={cn(
                      'min-h-11 cursor-pointer rounded-[8px] border-0 bg-transparent px-3 text-[14px] font-medium text-ink2',
                      filter === k && 'bg-surface font-semibold text-ink shadow-[0_1px_2px_rgba(0,0,0,0.12)]',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-1.5 text-[13px] text-muted">
                Sort
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as Sort)}
                  className="min-h-11 rounded-ctl border border-line2 bg-surface px-3 text-[14px] text-ink"
                >
                  <option value="name">Team name</option>
                  <option value="final">Final grade</option>
                  <option value="pending">Most pending</option>
                </select>
              </label>
            </div>
          </div>
          {rows.length ? (
            <GradeGrid rows={rows} cols={cols} releaseCounts={data.releaseCounts} />
          ) : (
            <p className="m-0 px-1.5 py-3 text-muted">No teams match this filter.</p>
          )}
          <div className="flex flex-wrap gap-4 text-[12px] text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-flex items-end gap-0.5">
                {[5, 8, 11].map((h) => (
                  <i key={h} className="block w-1 rounded-[1px] bg-current" style={{ height: h }} />
                ))}
                <i className="block h-3.5 w-1 rounded-[1px] border-[1.5px] border-current" />
              </span>
              Level band of the grade (bars + number)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Icon name="eye" size={12} />
              Released to students
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Icon name="half" size={12} />
              Waiting for reviewers
            </span>
            <span className="inline-flex items-center gap-1.5 text-amber">
              <Icon name="clock" size={12} />
              Overdue
            </span>
          </div>
        </Card>
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
          <ReleasePanel releases={data.releases} teamCount={data.teamCount} />
          <ActivityFeed items={data.activity} />
        </div>
      </div>
      <Suspense
        fallback={
          <div aria-busy="true" aria-label="Loading the insights" className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] gap-6">
            <Card className="h-64" />
            <Card className="h-64" />
          </div>
        }
      >
        <Insights data={data.insights} />
      </Suspense>
    </>
  )
}

function ReleasePanel({ releases, teamCount }: { releases: ReleaseCandidate[]; teamCount: number }) {
  const [asking, setAsking] = useState<AssessmentKey | null>(null)
  const release = useRelease()
  async function go(r: ReleaseCandidate) {
    try {
      await release.mutateAsync(r.assessment.key)
      setAsking(null)
      toast.success(`${r.assessment.name} results released to ${joinNames(r.pendingTeams.map((t) => `Team ${t.name}`))}.`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The release didn't go through. Try again.")
    }
  }
  return (
    <Card as="section" aria-labelledby="rel-h" className="flex flex-col gap-3 p-5">
      <h2 id="rel-h" className="m-0 text-[16px] font-semibold">
        Ready to release
      </h2>
      <p className="m-0 text-[13px] leading-[19px] text-muted">
        Releasing an assessment shows its grades, levels and comments to every team whose grade is final.
      </p>
      {releases.map((r) => {
        const short = joinNames(r.pendingTeams.map((t) => t.name))
        const long = joinNames(r.pendingTeams.map((t) => `Team ${t.name}`))
        return (
          <div key={r.assessment.key} className="flex flex-col gap-2.5 rounded-[12px] border border-line bg-paper p-3.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-semibold">{r.assessment.name}</span>
              <span className="mono text-[12px] text-muted">
                {r.finalTeams.length} of {teamCount} final · {r.releasedCount} released
              </span>
            </div>
            {asking !== r.assessment.key ? (
              <Button variant="ghost" className="justify-start whitespace-normal text-left text-[14px]" onClick={() => setAsking(r.assessment.key)}>
                <Icon name="eye" className="flex-none" />
                Release to {short}
              </Button>
            ) : (
              <div role="alertdialog" aria-label={`Confirm release of the ${r.assessment.name}`} className="flex flex-col gap-2.5">
                <p className="m-0 text-[14px] leading-[21px]">
                  Students on {long} will see their {r.assessment.name} grade, criterion levels and comments. Teams that aren't final get theirs when you
                  release again.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button className="flex-auto" onClick={() => void go(r)} disabled={release.isPending} autoFocus>
                    {release.isPending ? 'Releasing…' : 'Release now'}
                  </Button>
                  <Button variant="ghost" className="flex-auto" onClick={() => setAsking(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )
      })}
      {releases.length === 0 && <p className="m-0 text-[14px] text-ink2">Everything that is final has been released.</p>}
    </Card>
  )
}

const FEED_ICON: Record<ActivityKind, IconName> = { submit: 'lock', edit: 'pencil', schedule: 'calendar', final: 'check', release: 'eye', assignment: 'people' }

function ActivityFeed({ items }: { items: OverviewView['activity'] }) {
  return (
    <Card as="section" aria-labelledby="feed-h" className="flex flex-col gap-2 p-5">
      <div className="flex items-center justify-between">
        <h2 id="feed-h" className="m-0 text-[16px] font-semibold">
          Activity
        </h2>
        {items && (
          <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-green">
            <span aria-hidden="true" className="size-2 rounded-full bg-green shadow-[0_0_0_3px_var(--green-soft)]" />
            Live
          </span>
        )}
      </div>
      {!items ? (
        <p role="status" className="m-0 text-[14px] leading-[21px] text-muted">
          The activity feed isn't available right now. The grid above is up to date, and the feed comes back on its own.
        </p>
      ) : items.length ? (
        <ul aria-live="polite" className="m-0 list-none p-0">
          {items.map((e, i) => (
            <li key={e.id} className={cn('grid grid-cols-[28px_1fr] gap-2.5 py-3', i > 0 && 'border-t border-line')}>
              <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-[8px] bg-raised text-ink2">
                <Icon name={FEED_ICON[e.kind]} size={14} />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[14px] leading-5">
                  <strong className="font-semibold">{e.who}</strong> {e.text}
                </span>
                <span className="mono text-[12px] text-muted">{fmtStamp(e.at)}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-[14px] leading-[21px] text-muted">
          Nothing has happened yet. Submissions, releases and schedule changes appear here as they happen, without reloading.
        </p>
      )}
    </Card>
  )
}

/** CSV from the server (`GET /api/overview/export`), saved as a file. */
async function exportCsv() {
  try {
    const csv = await repository.exportCsv()
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `assay-results-${isoDay(0)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV downloaded.')
  } catch {
    toast.error("The export didn't work. Try again in a moment.")
  }
}

function OverviewSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading overview" className="flex flex-col gap-5">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
        {[70, 50, 75, 60, 70].map((w, i) => (
          <Card key={i} className="flex flex-col gap-2.5 p-5">
            <Skeleton className="h-3.5" style={{ width: `${w}%` }} />
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-2 w-full" />
          </Card>
        ))}
      </div>
      <div className="flex flex-wrap items-start gap-5">
        <Card className="flex min-w-0 flex-[999_1_760px] flex-col gap-2 p-5">
          <Skeleton className="mb-2 h-[18px] w-[200px]" />
          <div className="grid grid-cols-[200px_repeat(6,minmax(0,1fr))] gap-1.5 overflow-hidden">
            {Array.from({ length: 21 }, (_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        </Card>
        <Card className="flex min-w-0 flex-[1_1_320px] flex-col gap-3.5 p-5">
          <span className="flex justify-between">
            <Skeleton className="h-4 w-[90px]" />
            <span className="text-[13px] text-muted">Connecting…</span>
          </span>
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </Card>
      </div>
    </div>
  )
}

function OverviewError({ onRetry }: { onRetry: () => void }) {
  const reset = useResetDemo()
  const { signOut } = useAuth()
  return (
    <>
      <section aria-label="Key figures" className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
        {['Evaluations submitted', 'Overdue', 'Final grades computed', 'Results released', 'Average final grade'].map((l) => (
          <Kpi key={l} label={l} value={<span aria-label="Not available">—</span>} foot="Couldn't load" />
        ))}
      </section>
      <div className="flex flex-wrap items-start gap-5">
        <Card className="flex min-w-0 flex-[999_1_760px] flex-col gap-4 p-5">
          <h2 className="m-0 text-[18px] font-semibold">Teams × assessments</h2>
          <ErrorState
            compact
            title="The grade grid didn't load."
            actions={
              <>
                <Button onClick={onRetry}>Try again</Button>
                <Button
                  variant="ghost"
                  onClick={() =>
                    void reset.mutateAsync().then(
                      async () => {
                        await signOut()
                        window.location.assign('/')
                      },
                      (e: unknown) => toast.error(e instanceof Error ? e.message : "The reset didn't go through. Try again in a moment."),
                    )
                  }
                >
                  Reset my demo
                </Button>
              </>
            }
          >
            The server didn't answer in time. Your demo data is safe. Try again in a moment; if it keeps failing, "Reset my demo" gives you a fresh copy.
          </ErrorState>
        </Card>
        <Card className="flex min-w-0 flex-[1_1_320px] flex-col gap-2.5 p-5">
          <div className="flex items-center justify-between">
            <h2 className="m-0 text-[16px] font-semibold">Activity</h2>
            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-amber">
              <Icon name="pause" size={12} />
              Paused
            </span>
          </div>
          <p role="status" className="m-0 text-[14px] leading-[21px] text-ink2">
            Live updates paused: the connection dropped. Reconnecting automatically.
          </p>
          <Button variant="ghost" className="self-start" onClick={onRetry}>
            Reconnect now
          </Button>
        </Card>
      </div>
    </>
  )
}

function OverviewEmpty() {
  return (
    <div className="flex flex-wrap items-start gap-5">
      <EmptyState
        className="min-w-0 flex-[999_1_560px]"
        glyph={<Glyph size={26} strokeWidth={3} />}
        title="No teams in this session yet"
        actions={
          <>
            <Button asChild>
              <Link to="/teams?create=1">
                <Icon name="plus" />
                Create a team
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/schedule">Set due dates</Link>
            </Button>
          </>
        }
      >
        Create the first team, add its students, and assign at least one advisor and one jury member. The grid fills in as reviewers start grading.
      </EmptyState>
      <Card className="flex min-w-0 flex-[1_1_320px] flex-col gap-2.5 p-5">
        <h2 className="m-0 text-[16px] font-semibold">Activity</h2>
        <p className="m-0 text-[14px] leading-[21px] text-muted">
          Nothing has happened yet. Submissions, releases and schedule changes appear here as they happen, without reloading.
        </p>
      </Card>
    </div>
  )
}

