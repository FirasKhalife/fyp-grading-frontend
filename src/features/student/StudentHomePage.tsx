import { Accordion } from 'radix-ui'
import { useState } from 'react'
import { Link } from 'react-router'
import { useStudentHome } from '@/api/queries'
import type { StudentHomeView, StudentResult } from '@/api/views'
import { ASSESSMENTS, assessmentSlug } from '@/domain/assessments'
import { LEVEL_NAMES } from '@/domain/levels'
import { cn } from '@/lib/cn'
import { daysFromToday, dayOfMonth, fmtDay, fmtDayYear, fmtLong, fmtMonthAbbr, fmtShort, fmtTime, isoDay } from '@/lib/demo-clock'
import { formatScore } from '@/lib/scoring'
import { Icon } from '@/components/assay/Icon'
import { LevelMark, ScoreChip } from '@/components/assay/LevelMark'
import { Main, PageTitle, useTitle } from '@/components/assay/Page'
import { ErrorState } from '@/components/assay/States'
import { StatusChip } from '@/components/assay/StatusChip'
import { Button } from '@/components/ui/button'
import { Card, Skeleton } from '@/components/ui/card'
import { countsTowardFinal, weightLabel } from '@/lib/weight'

/** P11: the student's team, timeline, defense slot and released results. */
export function StudentHomePage() {
  const q = useStudentHome()
  useTitle(q.data ? `Team ${q.data.team.name}` : 'My team')
  if (q.isPending) return <StudentSkeleton />
  if (q.isError)
    return (
      <Main>
        <PageTitle>My team</PageTitle>
        <ErrorState title="We couldn't load your team." actions={<Button onClick={() => void q.refetch()}>Try again</Button>}>
          The server didn't respond. Try again; if it keeps happening, the demo may be restarting, so wait a minute.
        </ErrorState>
      </Main>
    )
  return <StudentHome v={q.data} />
}

function StudentHome({ v }: { v: StudentHomeView }) {
  const { team, results } = v
  const allReleased = v.releasedCount === ASSESSMENTS.length
  const latestIsRecent = v.latestRelease && daysFromToday(v.latestRelease.at) >= -1
  const latestName = v.latestRelease ? ASSESSMENTS.find((a) => a.key === v.latestRelease!.assessment)?.name : null
  const latestOpen = results.findIndex((r) => r.release && v.latestRelease && r.release.at === v.latestRelease.at && r.assessment.key === v.latestRelease.assessment)
  const [open, setOpen] = useState<string[]>(latestIsRecent && latestOpen >= 0 ? [`res-${latestOpen}`] : [])
  const def = team.defense

  return (
    <Main>
      {latestIsRecent && latestName && (
        <div role="status" className="flex items-center gap-3 rounded-[12px] bg-green-soft px-[18px] py-3.5 text-green">
          <Icon name="eye" size={18} className="flex-none" />
          <span>
            <strong>New:</strong> your {latestName} results are available.
            {allReleased && ' That completes all five, so your final grade is now visible.'}
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-start gap-6">
        <section aria-labelledby="team-h" className="flex min-w-0 flex-[999_1_520px] flex-col gap-3.5">
          <span className="mono text-[13px] text-muted">{fmtLong(isoDay(0), true)}</span>
          <PageTitle id="team-h" className="md:text-[40px] md:leading-[48px]">
            Team {team.name}
          </PageTitle>
          <p className="m-0 text-[18px] leading-[27px] text-ink2">{team.projectTitle}</p>
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[14px]">
            <dt className="text-muted">Team</dt>
            <dd className="m-0">
              {v.teammates.map((s) => `${s.firstName} ${s.lastName}${s.id === v.me.id ? ' (you)' : ''}`).join(', ')}
            </dd>
            <dt className="text-muted">Advisor</dt>
            <dd className="m-0">{v.advisors.map((p) => p.name).join(', ')}</dd>
            <dt className="text-muted">Jury</dt>
            <dd className="m-0">{v.jury.map((p) => p.name).join(', ')}</dd>
          </dl>
        </section>
        <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-3">
          <Card as="section" aria-labelledby="fg-h" className="flex flex-col gap-3 p-5">
            <h2 id="fg-h" className="m-0 text-[14px] font-semibold text-ink2">
              Final grade
            </h2>
            {allReleased && v.final !== null ? (
              <>
                <div className="flex flex-wrap items-center gap-3.5">
                  <span className="mono text-[48px] font-semibold leading-[52px] tracking-[-0.03em]">{formatScore(v.final)}</span>
                  <ScoreChip score={v.final} variant="bandOnly" />
                </div>
                <table className="w-full border-collapse text-[13px]">
                  <caption className="pb-1.5 text-left text-muted">How it adds up: assessment grade × weight</caption>
                  <tbody>
                    {results.map((r) => (
                      <tr key={r.assessment.key} className="border-t border-line">
                        <th scope="row" className="py-1.5 text-left font-medium">
                          {r.assessment.shortName === 'Final pres.' ? 'Final presentation' : r.assessment.shortName === 'Progress' ? 'Progress report' : r.assessment.shortName}
                        </th>
                        <td className="mono py-1.5 text-right">
                          {countsTowardFinal(r.assessment.weight) ? `${formatScore(r.grade ?? 0)} × ${r.assessment.weight}%` : `${formatScore(r.grade ?? 0)} · not counted`}
                        </td>
                        <td className="mono w-14 py-1.5 text-right font-semibold">{(((r.grade ?? 0) * r.assessment.weight) / 100).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <div className="flex items-start gap-3">
                <span aria-hidden="true" className="flex size-11 flex-none items-center justify-center rounded-ctl border-2 border-dashed border-line2 text-muted">
                  <Icon name="lock" size={18} />
                </span>
                <p className="m-0 text-[14px] leading-[21px] text-ink2">
                  Your final grade appears once all five results are released.{' '}
                  <strong className="mono">
                    {v.releasedCount} of {ASSESSMENTS.length}
                  </strong>{' '}
                  released so far.
                </p>
              </div>
            )}
          </Card>
          {def && (
            <Card as="section" aria-labelledby="def-h" className="flex items-start gap-3.5 p-5">
              <span aria-hidden="true" className="flex h-[60px] w-14 flex-none flex-col items-center justify-center rounded-ctl bg-pri-soft text-pri">
                <span className="text-[11px] font-semibold">{fmtMonthAbbr(def.start)}</span>
                <span className="mono text-[22px] font-semibold leading-6">{dayOfMonth(def.start)}</span>
              </span>
              <div className="flex flex-col gap-0.5">
                <h2 id="def-h" className="m-0 text-[15px] font-semibold">
                  Defense · {fmtDayYear(def.start)}, {fmtTime(def.start)}
                </h2>
                <p className="m-0 text-[14px] text-ink2">
                  {def.room} · {def.minutes} minutes · jury {v.jury.map((p) => p.name).join(', ')}
                </p>
                <p className="m-0 text-[13px] text-muted">
                  {daysFromToday(def.start) > 0
                    ? `In ${daysFromToday(def.start) === 1 ? '1 day' : `${daysFromToday(def.start)} days`}. Bring your demo setup 15 minutes early.`
                    : results.find((r) => r.assessment.key === 'FINAL_PRESENTATION')?.released
                      ? 'Done. The jury graded it the same day.'
                      : 'Done. The jury is grading now.'}
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      <Card as="section" aria-labelledby="tl-h" className="flex flex-col gap-5 p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="tl-h" className="m-0 text-[18px] font-semibold">
            Assessment timeline
          </h2>
          <span className="text-[13px] text-muted">Scores appear only after the coordinator releases them</span>
        </div>
        <ol className="m-0 grid list-none grid-cols-1 p-0 md:grid-cols-5">
          {results.map((r, i) => (
            <TimelineStep key={r.assessment.key} r={r} i={i} last={i === results.length - 1} />
          ))}
        </ol>
      </Card>

      <section aria-labelledby="res-h" className="flex flex-col gap-3">
        <h2 id="res-h" className="m-0 text-[22px] font-semibold">
          Results
        </h2>
        <Accordion.Root type="multiple" value={open} onValueChange={setOpen} className="flex flex-col gap-3">
          {results.map((r, i) =>
            r.released ? (
              <ResultCard key={r.assessment.key} r={r} value={`res-${i}`} />
            ) : (
              <Card key={r.assessment.key} className="flex min-h-[72px] flex-wrap items-center justify-between gap-4 px-5 py-4">
                <span className="flex flex-col gap-0.5">
                  <span className="text-[17px] font-semibold">{r.assessment.name}</span>
                  <span className="text-[13px] text-muted">{pendingMeta(r, v)}</span>
                </span>
                <span className="flex items-center gap-2 text-[14px] text-ink2">
                  <Icon name="half" />
                  Results will appear here once the coordinator releases them.
                </span>
              </Card>
            ),
          )}
        </Accordion.Root>
      </section>
    </Main>
  )
}

function pendingMeta(r: StudentResult, v: StudentHomeView): string {
  const w = weightLabel(r.assessment.weight)
  if (r.assessment.key === 'FINAL_PRESENTATION' && v.team.defense) {
    const d = daysFromToday(v.team.defense.start)
    if (d <= 0) return `${w} · defended ${fmtDay(v.team.defense.start)}, jury is grading`
    return `${w} · defense ${fmtDay(v.team.defense.start)}`
  }
  if (r.state === 'UPCOMING') return `${w} · due ${fmtDay(r.assessment.due)}`
  return `${w} · ${r.state === 'GRADED' ? 'graded, waiting for release' : 'being graded'}`
}

function TimelineStep({ r, i, last }: { r: StudentResult; i: number; last: boolean }) {
  const done = r.released
  const now = !done && r.state !== 'UPCOMING'
  const status = done ? 'Graded · released' : r.state === 'GRADED' ? 'Graded · not released yet' : r.state === 'BEING_GRADED' ? 'Being graded' : 'Upcoming'
  const due = r.assessment.key === 'FINAL_PRESENTATION' ? `Due ${fmtShort(r.assessment.due)}` : `Due ${fmtShort(r.assessment.due)}`
  return (
    <li className={cn('relative flex flex-row flex-wrap items-start gap-x-3 gap-y-1 pb-5 md:flex-col md:gap-1.5 md:pb-0 md:pr-4')}>
      {!last && (
        <span
          aria-hidden="true"
          className={cn(
            'absolute bottom-0 left-[15px] top-8 w-0.5 md:bottom-auto md:left-8 md:right-0 md:top-[15px] md:h-0.5 md:w-auto',
            done ? 'bg-pri' : 'bg-line',
          )}
        />
      )}
      <span
        aria-hidden="true"
        className={cn(
          'mono relative z-[1] flex size-8 flex-none items-center justify-center rounded-full text-[13px] font-semibold',
          done && 'bg-pri text-on-pri',
          now && 'border-2 border-dashed border-pri bg-surface text-pri',
          !done && !now && 'border-2 border-line2 bg-surface text-muted',
        )}
      >
        {done ? <Icon name="check" size={14} /> : i + 1}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="font-semibold leading-5">{r.assessment.name}</span>
        <span className="mono text-[12px] text-muted">
          {weightLabel(r.assessment.weight, 'short')} · {due}
        </span>
        <StatusChip kind={done ? 'releasedSoft' : now ? 'draft' : 'notStarted'} icon={done ? 'eye' : now ? 'half' : 'circle'} className="self-start">
          {status}
        </StatusChip>
        {done && r.grade !== null && <ScoreChip score={r.grade} className="self-start" labelPrefix={`${r.assessment.name} grade`} />}
      </div>
    </li>
  )
}

function ResultCard({ r, value }: { r: StudentResult; value: string }) {
  return (
    <Accordion.Item value={value} asChild>
      <Card>
        <Accordion.Header asChild>
          <h3 className="m-0 text-[length:inherit] font-[inherit]">
            <Accordion.Trigger className="group flex min-h-[72px] w-full cursor-pointer flex-wrap items-center justify-between gap-4 rounded-card border-0 bg-transparent px-4 py-3.5 text-left text-ink hover:bg-raised md:px-5 md:py-4">
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[17px] font-semibold">{r.assessment.name}</span>
                <span className="text-[13px] text-muted">
                  {weightLabel(r.assessment.weight)} · released {r.release ? fmtShort(r.release.at) : ''}
                </span>
              </span>
              <span className="flex items-center gap-3">
                {r.grade !== null && <ScoreChip score={r.grade} labelPrefix="Team grade" />}
                <Icon name="chevronDown" size={18} className="transition-transform group-data-[state=open]:rotate-180" />
              </span>
            </Accordion.Trigger>
          </h3>
        </Accordion.Header>
        <Accordion.Content className="flex flex-col gap-4 px-4 pb-4 md:px-5 md:pb-5">
          <div className="flex flex-wrap gap-2">
            {r.reviewers.map((x) => (
              <StatusChip key={x.reviewer.id} kind="plain">
                {x.reviewer.name} <span className="mono font-semibold text-ink">{x.score !== null ? formatScore(x.score) : '—'}</span>
              </StatusChip>
            ))}
            <StatusChip kind="plain">Team grade = plain average</StatusChip>
          </div>
          {r.overall.map((o) => (
            <div key={o.reviewer.id} className="grid grid-cols-[28px_1fr] gap-2.5 text-[14px] leading-[21px]">
              <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-full bg-raised text-[11px] font-semibold text-ink2">
                {o.reviewer.initials}
              </span>
              <p className="m-0">
                <strong>Overall · {o.reviewer.name}:</strong> {o.text}
              </p>
            </div>
          ))}
          <div>
            {r.criteria.map((c) => (
              <div key={c.criterion.id} className="flex flex-col gap-2.5 border-t border-line py-4 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:gap-x-6">
                <div className="flex min-w-0 flex-col gap-2">
                  <p className="m-0 font-semibold [overflow-wrap:anywhere]">
                    {c.criterion.name} <span className="mono text-[13px] font-medium text-muted">{c.criterion.weight}%</span>
                  </p>
                  {c.comments.map((q) => (
                    <div key={q.reviewer.id} className="grid grid-cols-[28px_1fr] gap-2.5 text-[14px] leading-[21px]">
                      <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-full bg-raised text-[11px] font-semibold text-ink2">
                        {q.reviewer.initials}
                      </span>
                      <p className="m-0 text-ink2">
                        <span className="text-muted">{q.reviewer.name}:</span> {q.text}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-start gap-1.5">
                  {c.levels.map((l) =>
                    l.level === null ? null : (
                      <LevelMark
                        key={l.reviewer.id}
                        level={l.level}
                        prefix={l.reviewer.initials}
                        className="h-[30px]"
                        label={`${l.reviewer.name}: ${LEVEL_NAMES[l.level]}, level ${l.level}`}
                      />
                    ),
                  )}
                </div>
              </div>
            ))}
          </div>
          <Link to={`/rubrics/${assessmentSlug(r.assessment.key)}`} className="inline-flex min-h-11 items-center self-start font-semibold">
            See the {r.assessment.name} rubric and level descriptions
          </Link>
        </Accordion.Content>
      </Card>
    </Accordion.Item>
  )
}

function StudentSkeleton() {
  return (
    <Main>
      <div aria-busy="true" aria-label="Loading your team" className="flex flex-col gap-5">
        <Skeleton className="h-3.5 w-48" />
        <Skeleton className="h-11 w-60" />
        <Skeleton className="h-5 w-[min(460px,90%)]" />
        <Card className="flex flex-col gap-4 p-6">
          <Skeleton className="h-5 w-48" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </Card>
      </div>
    </Main>
  )
}

