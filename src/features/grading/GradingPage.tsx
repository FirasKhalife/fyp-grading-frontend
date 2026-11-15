import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { ApiError } from '@/api/repository'
import { useGrading, useSubmit } from '@/api/queries'
import type { GradingView } from '@/api/views'
import { assessmentFromSlug, assessmentSlug } from '@/domain/assessments'
import { bandOf, LEVEL_NAMES } from '@/domain/levels'
import type { Level } from '@/domain/types'
import { cn } from '@/lib/cn'
import { daysFromToday, fmtAgo, fmtDay, fmtRelativeDays, fmtShort, fmtTime } from '@/lib/demo-clock'
import { formatScore, reviewerScore } from '@/lib/scoring'
import { Icon } from '@/components/assay/Icon'
import { FILL, LevelBars } from '@/components/assay/LevelMark'
import { Breadcrumb, Main, PageTitle, useTitle } from '@/components/assay/Page'
import { ErrorState } from '@/components/assay/States'
import { StatusChip } from '@/components/assay/StatusChip'
import { Button } from '@/components/ui/button'
import { Card, Skeleton } from '@/components/ui/card'
import { NotFoundPage, NoPermissionPage } from '../utility/UtilityPages'
import { LevelPicker } from './LevelPicker'
import { useDraft } from './useDraft'

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five']

/** P4: score one team on one assessment. */
export function GradingPage() {
  const { teamId = '', assessment: slug } = useParams()
  const key = assessmentFromSlug(slug)
  const q = useGrading(teamId, key ?? 'PROPOSAL_PRESENTATION')
  useTitle(q.data ? `${q.data.assessment.name} · Team ${q.data.team.name}` : 'Grading')

  if (!key) return <NotFoundPage />
  if (q.isPending) return <GradingSkeleton />
  if (q.isError) {
    const err = q.error
    if (err instanceof ApiError && err.status === 404) return <NotFoundPage />
    if (err instanceof ApiError && err.status === 403) return <NoPermissionPage for="reviewer" />
    return (
      <Main>
        <PageTitle>Grading</PageTitle>
        <ErrorState
          title="We couldn't load this evaluation."
          actions={
            <>
              <Button onClick={() => void q.refetch()}>Try again</Button>
              <Button asChild variant="ghost">
                <Link to="/my-teams">Back to My teams</Link>
              </Button>
            </>
          }
        >
          The server didn't respond. Your draft is saved and nothing was lost. Try again; if it keeps happening, the demo may be restarting, so wait a
          minute.
        </ErrorState>
      </Main>
    )
  }
  return <GradingForm key={`${teamId}-${key}`} view={q.data} />
}

function GradingForm({ view }: { view: GradingView }) {
  const { team, assessment: a, rubric, evaluation, peers } = view
  const criteria = rubric.criteria
  const ids = useMemo(() => criteria.map((c) => c.id), [criteria])
  const { draft, setLevel, setComment, setOverall, takeForSubmit, savedAt, saving, failed } = useDraft(team.id, a.key, evaluation, ids)
  const submit = useSubmit(team.id, a.key)
  const [openComments, setOpenComments] = useState<string[]>([])
  const [confirming, setConfirming] = useState(false)
  const [missing, setMissing] = useState(false)
  const [, tick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])

  const locked = evaluation?.status === 'SUBMITTED'
  const items = criteria.map((c) => ({ level: draft.levels[c.id] ?? null, weight: c.weight }))
  const score = reviewerScore(items)
  const band = bandOf(score)
  const scored = items.filter((i) => i.level !== null).length
  const remaining = criteria.length - scored
  const nextIdx = items.findIndex((i) => i.level === null)
  const nextId = nextIdx >= 0 ? `c${nextIdx + 1}` : 'c1'
  const dueIn = daysFromToday(a.due)
  const overdue = !locked && dueIn < 0
  const others = peers.filter((p) => !p.you)
  const submittedCount = peers.filter((p) => p.state === 'SUBMITTED').length
  const state = locked ? 'SUBMITTED' : evaluation ? 'DRAFT' : 'NOT_STARTED'

  function pick(id: string, l: Level) {
    if (locked) return
    setConfirming(false)
    setLevel(id, l)
  }

  function goTo(id: string) {
    const el = document.getElementById(id)
    el?.scrollIntoView({ block: 'start' })
    el?.querySelector<HTMLElement>('[role="radio"]')?.focus({ preventScroll: true })
  }

  function onSubmit() {
    if (remaining > 0) {
      setMissing(true)
      goTo(nextId)
      return
    }
    setConfirming(true)
  }

  async function onConfirm() {
    try {
      // The submit carries the final form state, so the last edits and the lock are one call.
      await submit.mutateAsync(takeForSubmit())
      setConfirming(false)
      toast.success(`Submitted. Team ${team.name}'s ${a.name.toLowerCase()} is locked with your score of ${formatScore(score)}.`)
      window.scrollTo({ top: 0 })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The submission didn't go through. Try again.")
    }
  }

  const savedText = locked
    ? 'Submitted and locked'
    : failed
      ? "Couldn't save. Retrying on your next change."
      : saving
        ? 'Saving…'
        : savedAt && evaluation
          ? `Draft saved ${fmtAgo(savedAt)}`
          : 'Your draft saves as you go'
  const submittedAt = evaluation?.submittedAt
  const roleWord = a.role === 'JURY' ? 'jury' : 'advisor'

  return (
    <>
      <Main className={cn('pb-20', !locked && 'pb-4 md:pb-20')}>
        <div className="flex flex-col gap-3.5">
          <Breadcrumb items={[{ label: 'My teams', to: '/my-teams' }, { label: `Team ${team.name}` }, { label: a.name }]} />
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              <PageTitle>
                {a.name} · Team {team.name}
              </PageTitle>
              <p className="m-0 text-[17px] leading-[25px] text-ink2">{team.projectTitle}</p>
            </div>
            <Button asChild variant="ghost" className="hidden md:inline-flex">
              <Link to={`/rubrics/${assessmentSlug(a.key)}`}>
                <Icon name="table" />
                Full rubric
              </Link>
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {state === 'SUBMITTED' && <StatusChip kind="submitted" />}
            {state === 'DRAFT' && <StatusChip kind="draft" />}
            {state === 'NOT_STARTED' && <StatusChip kind="notStarted" />}
            {overdue ? (
              <StatusChip kind="overdue">Overdue · due {fmtDay(a.due)}</StatusChip>
            ) : (
              <StatusChip kind="plain" icon="calendar">
                Due {fmtDay(a.due)}
                {!locked && ` · ${fmtRelativeDays(a.due)}`}
              </StatusChip>
            )}
            <StatusChip kind="plain">
              {a.role === 'JURY' ? 'Jury' : 'Advisor'} · {criteria.length} criteria
            </StatusChip>
            <StatusChip kind="plain">
              <span className="mono font-semibold">{a.weight}%</span> of final grade
            </StatusChip>
            {others.length > 0 && (
              <StatusChip kind="plain" className="md:hidden">
                {a.role === 'JURY' ? 'Jury' : 'Reviewers'}: {submittedCount} of {peers.length} submitted
              </StatusChip>
            )}
          </div>
          {!locked && (
            <p className="m-0 max-w-[860px] text-ink2">
              For each criterion, pick the description that best matches the work. Tab moves between criteria, arrow keys move between levels. Your
              draft saves as you go.
            </p>
          )}
        </div>

        {locked && submittedAt && (
          <div role="status" className="flex items-center gap-3 rounded-[12px] bg-green-soft px-5 py-4 text-green">
            <Icon name="lock" size={20} className="flex-none" />
            <span>
              <strong>
                Submitted {fmtDay(submittedAt)}, {fmtTime(submittedAt)}.
              </strong>{' '}
              This evaluation is locked and can't be changed.
            </span>
          </div>
        )}
        {overdue && (
          <div role="note" className="flex items-start gap-3 rounded-[12px] border border-amber-line bg-amber-bg px-[18px] py-3.5 text-[14px] leading-[21px]">
            <Icon name="clock" size={18} className="mt-0.5 flex-none text-amber" />
            <span>
              <strong>This evaluation was due {fmtDay(a.due)}.</strong> You can still grade and submit it; it will be marked overdue.
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-start gap-8">
          <div className="flex min-w-0 flex-[999_1_640px] flex-col gap-4">
            {criteria.map((c, i) => {
              const lvl = draft.levels[c.id] ?? null
              const comment = draft.comments[c.id] ?? ''
              const showCom = comment.length > 0 || openComments.includes(c.id)
              const id = `c${i + 1}`
              return (
                <section
                  key={c.id}
                  id={id}
                  aria-labelledby={`${id}-name`}
                  className={cn(
                    'flex scroll-mt-6 flex-col gap-4 rounded-card border border-line bg-surface p-4 transition-colors duration-150 md:p-6',
                    lvl === null && !locked && 'border-amber-line',
                    lvl === null && !locked && missing && 'border-2 border-amber-line bg-amber-bg',
                  )}
                >
                  <div className="flex flex-wrap items-start gap-4 md:flex-nowrap">
                    <span className="mono flex-none text-[14px] font-semibold leading-[25px] text-muted">{String(i + 1).padStart(2, '0')}</span>
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <h2 id={`${id}-name`} className="m-0 max-w-[760px] text-[17px] font-semibold leading-[25px] [overflow-wrap:anywhere]">
                        {c.name}
                      </h2>
                      {lvl === null && !locked && (
                        <StatusChip kind="overdue" icon="circleDashed" className="self-start">
                          Not scored yet
                        </StatusChip>
                      )}
                    </div>
                    <div className="flex w-full flex-none flex-row justify-start gap-4 pl-8 text-[13px] text-muted md:w-auto md:flex-col md:items-end md:gap-0.5 md:pl-0">
                      <span>
                        Weight <span className="mono font-semibold text-ink">{c.weight}%</span>
                      </span>
                      <span>
                        <span className="mono text-[15px] font-semibold text-ink">{lvl === null ? '–' : formatScore((lvl * c.weight) / 4)}</span> / {c.weight} pts
                      </span>
                    </div>
                  </div>
                  <LevelPicker criterion={c} value={lvl} onChange={(l) => pick(c.id, l)} locked={locked} labelledBy={`${id}-name`} />
                  {showCom && (
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor={`${id}-com`} className="text-[14px] font-semibold">
                        Comment for the team <span className="font-normal text-muted">· optional, students see it once results are released</span>
                      </label>
                      <textarea
                        id={`${id}-com`}
                        rows={2}
                        value={comment}
                        readOnly={locked}
                        onChange={(e) => setComment(c.id, e.target.value)}
                        placeholder="What should the team keep, or fix first?"
                        className="min-h-11 w-full resize-y rounded-ctl border border-line2 bg-surface px-3 py-2.5 text-[15px] leading-[22px] text-ink placeholder:text-muted"
                      />
                    </div>
                  )}
                  {!showCom && !locked && (
                    <Button
                      variant="quiet"
                      className="self-start border border-dashed border-line2 text-[14px]"
                      onClick={() => {
                        setOpenComments((o) => [...o, c.id])
                        setTimeout(() => document.getElementById(`${id}-com`)?.focus(), 0)
                      }}
                    >
                      <Icon name="plus" size={14} />
                      Add a comment
                    </Button>
                  )}
                </section>
              )
            })}

            <Card as="section" aria-labelledby="overall-h" className="flex flex-col gap-2.5 p-6">
              <h2 id="overall-h" className="m-0 text-[17px] font-semibold">
                <label htmlFor="overall">Overall comment</label>
              </h2>
              <p className="m-0 text-[14px] text-muted">Optional. Shown to Team {team.name} with the results.</p>
              <textarea
                id="overall"
                rows={4}
                value={draft.overall}
                readOnly={locked}
                onChange={(e) => setOverall(e.target.value)}
                placeholder="A short summary for the team: main strengths, and the one thing to fix first."
                className="min-h-11 w-full resize-y rounded-ctl border border-line2 bg-surface px-3 py-2.5 text-[15px] leading-[22px] text-ink placeholder:text-muted"
              />
            </Card>
          </div>

          <aside
            aria-label="Score and submission"
            className="sticky top-4 hidden max-h-[calc(100vh-32px)] min-w-0 flex-[1_1_340px] flex-col gap-4 self-start overflow-auto md:flex"
          >
            <Card as="section" aria-labelledby="score-h" className="flex flex-col gap-4 p-6">
              <div className="flex items-baseline justify-between">
                <h2 id="score-h" className="m-0 text-[15px] font-semibold text-ink2">
                  Your score
                </h2>
                <span className="text-[13px] text-muted">updates live</span>
              </div>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <p className="m-0 flex items-baseline gap-1.5" aria-live="polite">
                  <span className="mono text-[56px] font-semibold leading-[56px] tracking-[-0.03em]">{formatScore(score)}</span>
                  <span className="mono text-[16px] text-muted">/ 100</span>
                </p>
                <span className={cn('inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-chip px-2.5 text-[13px] font-semibold', FILL[band])}>
                  <LevelBars level={band} />
                  {LEVEL_NAMES[band]} band
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                <span className="text-[14px] text-ink2">
                  <strong className="mono">{scored}</strong> of {criteria.length} criteria scored
                </span>
                <div className="grid grid-cols-7 gap-1.5">
                  {criteria.map((c, i) => {
                    const l = draft.levels[c.id] ?? null
                    return (
                      <a
                        key={c.id}
                        href={`#c${i + 1}`}
                        onClick={(e) => {
                          e.preventDefault()
                          goTo(`c${i + 1}`)
                        }}
                        aria-label={`#${i + 1} ${l === null ? '–' : l}. Criterion ${i + 1}, ${c.name}: ${l === null ? 'not scored' : LEVEL_NAMES[l]}`}
                        className={cn(
                          'flex min-h-11 flex-col items-center justify-center rounded-[8px] border border-transparent no-underline hover:outline-2 hover:outline-offset-1 hover:outline-pri',
                          l === null ? 'border-[1.5px] border-dashed border-amber-line bg-surface text-amber hover:text-amber' : FILL[l],
                        )}
                      >
                        <span className="text-[10px] leading-3 opacity-85">#{i + 1}</span>{' '}
                        <span className="mono text-[15px] font-semibold leading-[18px]">{l === null ? '–' : l}</span>
                      </a>
                    )
                  })}
                </div>
                <span className="text-[13px] leading-[19px] text-muted">
                  Each tile is one criterion and its level. Unscored criteria count as 0 until you pick a level.
                </span>
              </div>
            </Card>

            <Card as="section" aria-label="Submit" className="flex flex-col gap-3.5 p-6">
              <p role="status" className="m-0 flex items-center gap-2 text-[14px] text-ink2">
                <Icon name={failed ? 'warn' : 'check'} className={failed ? 'text-amber' : 'text-green'} />
                {savedText}
              </p>
              {!locked && !confirming && (
                <Button size="lg" className="w-full" onClick={onSubmit} aria-disabled={remaining > 0 || undefined}>
                  Submit evaluation
                </Button>
              )}
              {!locked && remaining > 0 && (
                <p className="m-0 flex flex-col gap-0.5 text-[14px] leading-[21px] text-amber">
                  <span>
                    Score {remaining} more {remaining === 1 ? 'criterion' : 'criteria'} to submit.
                  </span>
                  <a
                    href={`#${nextId}`}
                    onClick={(e) => {
                      e.preventDefault()
                      goTo(nextId)
                    }}
                    className="inline-flex min-h-8 items-center font-semibold text-amber hover:text-amber"
                  >
                    Go to criterion {nextIdx + 1}
                  </a>
                </p>
              )}
              {confirming && !locked && (
                <ConfirmBox score={formatScore(score)} onConfirm={() => void onConfirm()} onCancel={() => setConfirming(false)} busy={submit.isPending} />
              )}
              {locked && submittedAt && (
                <p className="m-0 text-[14px] leading-[21px] text-green">
                  <strong>
                    Submitted {fmtShort(submittedAt)}, {fmtTime(submittedAt)}.
                  </strong>{' '}
                  Locked for good.{' '}
                  {submittedCount === peers.length
                    ? `Team ${team.name}'s ${a.name.toLowerCase()} grade is now final.`
                    : `The team grade is computed once all ${peers.length} ${roleWord} scores are in.`}
                </p>
              )}
            </Card>

            <Card as="section" aria-labelledby="ctx-h" className="flex flex-col gap-3.5 p-6">
              <h2 id="ctx-h" className="m-0 text-[15px] font-semibold text-ink2">
                Team {team.name} {roleWord} · {submittedCount} of {peers.length} submitted
              </h2>
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                {peers.map((p) => (
                  <li key={p.reviewer.id} className="flex items-center justify-between gap-3 text-[14px]">
                    <span className="font-medium">
                      {p.reviewer.name}
                      {p.you && ' (you)'}
                    </span>
                    {p.state === 'SUBMITTED' ? (
                      <StatusChip kind="submitted">{p.at ? (daysFromToday(p.at) === 0 ? 'Submitted today' : `Submitted ${fmtShort(p.at)}`) : 'Submitted'}</StatusChip>
                    ) : p.state === 'DRAFT' ? (
                      <StatusChip kind="draft" />
                    ) : (
                      <StatusChip kind="notStarted" />
                    )}
                  </li>
                ))}
              </ul>
              <p className="m-0 border-t border-line pt-3 text-[13px] leading-[19px] text-muted">
                {peers.length > 1
                  ? `The team's ${a.name.toLowerCase()} grade is the plain average of the ${WORDS[peers.length] ?? peers.length} ${roleWord} scores and counts for ${a.weight}% of Team ${team.name}'s final grade. Other reviewers' scores stay hidden while you grade.`
                  : `Your score is the team's ${a.name.toLowerCase()} grade and counts for ${a.weight}% of Team ${team.name}'s final grade.`}
                {a.weight === 0 && ' It counts 0% but must be submitted before the final grade can be computed.'}
              </p>
            </Card>
          </aside>
        </div>
      </Main>

      <MobileScoreBar
        score={formatScore(score)}
        band={band}
        scored={scored}
        total={criteria.length}
        savedShort={locked ? 'locked' : saving ? 'saving…' : savedAt && evaluation ? `saved ${fmtAgo(savedAt)}` : 'not saved yet'}
        locked={locked}
        remaining={remaining}
        nextN={nextIdx + 1}
        onNext={() => goTo(nextId)}
        confirming={confirming}
        onSubmit={onSubmit}
        onConfirm={() => void onConfirm()}
        onCancel={() => setConfirming(false)}
      />
    </>
  )
}

function ConfirmBox({ score, onConfirm, onCancel, busy }: { score: string; onConfirm: () => void; onCancel: () => void; busy: boolean }) {
  return (
    <div role="alertdialog" aria-labelledby="confirm-h" aria-describedby="confirm-d" className="flex flex-col gap-3 rounded-[12px] border-2 border-sel bg-pri-soft p-4">
      <h3 id="confirm-h" className="m-0 text-[16px] font-semibold">
        Submit with a score of {score}?
      </h3>
      <p id="confirm-d" className="m-0 text-[14px] leading-[21px]">
        Submitting locks this evaluation. You won't be able to change it.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button className="flex-auto" onClick={onConfirm} disabled={busy} autoFocus>
          {busy ? 'Submitting…' : 'Submit and lock'}
        </Button>
        <Button variant="ghost" className="flex-auto" onClick={onCancel}>
          Keep editing
        </Button>
      </div>
    </div>
  )
}

function MobileScoreBar(p: {
  score: string
  band: Level
  scored: number
  total: number
  savedShort: string
  locked: boolean
  remaining: number
  nextN: number
  onNext: () => void
  confirming: boolean
  onSubmit: () => void
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      role="region"
      aria-label="Score and submission"
      className="sticky bottom-0 z-[5] flex flex-col gap-2.5 border-t border-line bg-surface px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] md:hidden"
    >
      {!p.confirming || p.locked ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="flex items-baseline gap-1.5" aria-live="polite">
                <span className="mono text-[28px] font-semibold leading-8">{p.score}</span>
                <span className="mono text-[13px] text-muted">/ 100</span>
                <span className={cn('ml-1 inline-flex h-6 items-center gap-1.5 rounded-chip px-1.5 text-[13px] font-semibold', FILL[p.band])}>
                  <LevelBars level={p.band} />
                  <span className="mono">{p.band}</span>
                  <span className="sr-only">{LEVEL_NAMES[p.band]} band</span>
                </span>
              </span>
              <span className="text-[13px] text-muted">
                {p.scored} of {p.total} scored · {p.savedShort}
              </span>
            </div>
            {p.locked ? (
              <StatusChip kind="submitted">Locked</StatusChip>
            ) : (
              <Button onClick={p.onSubmit} aria-disabled={p.remaining > 0 || undefined}>
                Submit
              </Button>
            )}
          </div>
          {!p.locked && p.remaining > 0 && (
            <button type="button" onClick={p.onNext} className="inline-flex min-h-8 cursor-pointer items-center self-start bg-transparent p-0 text-[14px] font-semibold text-amber underline">
              {p.remaining} left to score · go to criterion {p.nextN}
            </button>
          )}
        </>
      ) : (
        <div role="alertdialog" aria-labelledby="mconfirm-h" aria-describedby="mconfirm-d" className="flex flex-col gap-2.5">
          <h3 id="mconfirm-h" className="m-0 text-[17px] font-semibold">
            Submit with a score of {p.score}?
          </h3>
          <p id="mconfirm-d" className="m-0 text-[15px] leading-[22px]">
            Submitting locks this evaluation. You won't be able to change it.
          </p>
          <Button onClick={p.onConfirm} autoFocus>
            Submit and lock
          </Button>
          <Button variant="ghost" onClick={p.onCancel}>
            Keep editing
          </Button>
        </div>
      )}
    </div>
  )
}

function GradingSkeleton() {
  return (
    <Main>
      <div aria-busy="true" aria-label="Loading the grading form" className="flex flex-col gap-4">
        <Skeleton className="h-4 w-60" />
        <Skeleton className="h-10 w-[min(520px,90%)]" />
        <Skeleton className="h-5 w-80" />
        <div className="flex flex-wrap gap-8">
          <div className="flex min-w-0 flex-[999_1_640px] flex-col gap-4">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="flex flex-col gap-4 p-6">
                <Skeleton className="h-5 w-3/4" />
                <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
                  {[0, 1, 2, 3, 4].map((j) => (
                    <Skeleton key={j} className="h-28" />
                  ))}
                </div>
              </Card>
            ))}
          </div>
          <Card className="hidden h-80 flex-[1_1_340px] p-6 md:block">
            <Skeleton className="h-14 w-40" />
          </Card>
        </div>
      </div>
    </Main>
  )
}
