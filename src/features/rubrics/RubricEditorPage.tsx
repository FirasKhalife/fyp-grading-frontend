import { useRef, useState } from 'react'
import { Link, useBlocker, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { useRubrics, useSaveRubric } from '@/api/queries'
import type { RubricsView } from '@/api/views'
import { assessmentFromSlug, assessmentSlug } from '@/domain/assessments'
import { LEVEL_NAMES } from '@/domain/levels'
import type { AssessmentKey, Criterion, Level } from '@/domain/types'
import { cn, joinNames } from '@/lib/cn'
import { fmtStamp } from '@/lib/demo-clock'
import { weightsTotal } from '@/lib/scoring'
import { ApiError } from '@/api/repository'
import { Icon } from '@/components/assay/Icon'
import { LimitHint } from '@/components/assay/LimitHint'
import { FILL, LevelBars } from '@/components/assay/LevelMark'
import { Breadcrumb, Main, PageTitle, useTitle } from '@/components/assay/Page'
import { ErrorState } from '@/components/assay/States'
import { Button } from '@/components/ui/button'
import { Card, Skeleton } from '@/components/ui/card'
import { NotFoundPage } from '../utility/UtilityPages'
import { weightLabel } from '@/lib/weight'

interface Row {
  k: string
  id: string
  name: string
  weight: number | ''
  d: [string, string, string, string]
}

/** The contract's limits (RubricPut). */
const CRITERIA_MAX = 20
const NAME_MAX = 300
const DESCRIPTION_MAX = 1000

const field = 'min-h-11 w-full resize-y rounded-ctl border border-line2 bg-surface px-3 py-2.5 text-[15px] leading-[22px] text-ink'
const iconBtn =
  'inline-flex size-11 cursor-pointer items-center justify-center rounded-ctl border border-line bg-surface text-ink disabled:cursor-default disabled:opacity-40'

/** P7 editor: add, remove, reorder criteria; names, weights, descriptions; must total 100 % to save. */
export function RubricEditorPage() {
  const { assessment: slug } = useParams()
  const key = assessmentFromSlug(slug)
  const q = useRubrics()
  if (!key) return <NotFoundPage />
  if (q.isPending)
    return (
      <Main>
        <div aria-busy="true" aria-label="Loading the rubric" className="flex flex-col gap-4">
          <Skeleton className="h-11 w-96" />
          <Card className="h-96" />
        </div>
      </Main>
    )
  if (q.isError)
    return (
      <Main>
        <PageTitle>Edit rubric</PageTitle>
        <ErrorState title="The rubric didn't load." actions={<Button onClick={() => void q.refetch()}>Try again</Button>}>
          The server didn't respond. Try again in a moment.
        </ErrorState>
      </Main>
    )
  return <Editor key={key} assessmentKey={key} data={q.data} />
}

function Editor({ assessmentKey, data }: { assessmentKey: AssessmentKey; data: RubricsView }) {
  const a = data.assessments.find((x) => x.key === assessmentKey)!
  const rubric = data.rubrics.find((r) => r.assessment === assessmentKey)!
  useTitle(`Edit ${a.name} rubric`)
  const navigate = useNavigate()
  const save = useSaveRubric(assessmentKey)
  const [rows, setRows] = useState<Row[]>(() => rubric.criteria.map((c) => ({ k: c.id, id: c.id, name: c.name, weight: c.weight, d: [...c.descriptions] })))
  const [open, setOpen] = useState<string | null>(null)
  const [dirty, setDirtyState] = useState(false)
  const dirtyRef = useRef(false)
  const setDirty = (v: boolean) => {
    dirtyRef.current = v
    setDirtyState(v)
  }
  const [saved, setSaved] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<number, string[]>>({})
  const total = weightsTotal(rows.map((r) => r.weight))
  // Weights are whole numbers (contract 1.3.0: 33.5 is a 400).
  const whole = rows.every((r) => r.weight === '' || Number.isInteger(r.weight))
  const ok = total === 100 && whole && rows.every((r) => r.name.trim()) && rows.length > 0
  const diff = 100 - total
  const sub = data.submittedCount[assessmentKey]
  const edited = data.edited[assessmentKey] ?? null
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirtyRef.current && currentLocation.pathname !== nextLocation.pathname)

  function update(next: Row[]) {
    setRows(next)
    setDirty(true)
    setSaved(false)
  }
  function patch(i: number, p: Partial<Row>) {
    update(rows.map((r, j) => (j === i ? { ...r, ...p } : r)))
  }
  function moveRow(i: number, by: -1 | 1) {
    const j = i + by
    if (j < 0 || j >= rows.length) return
    const next = [...rows]
    ;[next[i], next[j]] = [next[j]!, next[i]!]
    update(next)
    // Keep focus on the same button of the moved row.
    setTimeout(() => document.getElementById(`${by < 0 ? 'up' : 'down'}-${rows[i]!.k}`)?.focus(), 0)
  }

  async function onSave() {
    if (!ok) return
    try {
      await save.mutateAsync(
        rows.map((r): Criterion => ({ id: r.id, name: r.name.trim(), weight: Number(r.weight), descriptions: r.d })),
      )
      setDirty(false)
      setSaved(true)
      setFieldErrors({})
      toast.success(`${a.name} rubric saved. Reviewers see it right away.`)
    } catch (e) {
      // Field errors ("criteria[2].weight") go next to the criterion they're about.
      if (e instanceof ApiError && e.errors.length) {
        const byRow: Record<number, string[]> = {}
        for (const er of e.errors) {
          const m = er.field.match(/^criteria\[(\d+)\]\.?(\w*)/)
          const idx = m ? Number(m[1]) : -1
          const what = m?.[2] ? `${m[2].replace(/^./, (x) => x.toUpperCase())} ${er.message}` : er.message
          ;(byRow[idx] ??= []).push(what)
        }
        setFieldErrors(byRow)
      }
      toast.error(e instanceof Error ? e.message : "The rubric didn't save.")
    }
  }

  const msg = saved
    ? 'Saved. Reviewers see the new rubric right away.'
    : !rows.every((r) => r.name.trim())
      ? 'Every criterion needs a name.'
      : !whole
        ? 'Weights must be whole numbers, like 15 or 20.'
      : ok
        ? 'Weights add up to 100%. Ready to save.'
        : diff > 0
          ? `Add ${diff}% before saving.`
          : `Remove ${-diff}% before saving.`

  return (
    <Main className="gap-5 pb-10">
      <Breadcrumb items={[{ label: 'Rubrics', to: `/rubrics/${assessmentSlug(assessmentKey)}` }, { label: `Edit ${a.name}` }]} />
      <div className="flex flex-col gap-1.5">
        <PageTitle>Edit rubric · {a.name}</PageTitle>
        <p className="m-0 text-ink2">
          {a.role === 'JURY' ? 'Jury' : 'Advisor'} assessment · {weightLabel(a.weight)}. Reorder with the arrow buttons; weights must total 100% to
          save.
        </p>
        <p className="m-0 text-[13px] text-muted">
          {edited ? (
            <>
              Last edited by {edited.by}
              {edited.at && <>, {fmtStamp(edited.at)}</>}.
            </>
          ) : (
            'Not edited since the session started: this is the seeded rubric.'
          )}
        </p>
      </div>
      {sub && sub.total > 0 && (
        <div role="alert" className="flex gap-3 rounded-[12px] border border-amber-line bg-amber-bg px-[18px] py-4">
          <Icon name="warn" size={20} className="flex-none text-amber" />
          <p className="m-0 text-[14px] leading-[21px]">
            <strong>
              {sub.total} evaluation{sub.total > 1 ? 's were' : ' was'} already submitted with this rubric
            </strong>{' '}
            ({joinNames(sub.byTeam.map((t) => `${t.team} ${t.count}`))}). Changing criteria or weights now can make those grades inconsistent with the new
            rubric.
          </p>
        </div>
      )}
      <Card as="section" aria-label="Criteria">
        <ol className="m-0 list-none p-0">
          {rows.map((r, i) => {
            const isOpen = open === r.k
            return (
              <li key={r.k} className={cn('grid grid-cols-[44px_minmax(0,1fr)] items-start gap-3 px-4 py-4 md:grid-cols-[44px_minmax(0,1fr)_130px_auto] md:px-5', i > 0 && 'border-t border-line')}>
                <div className="flex flex-col gap-1">
                  <button type="button" id={`up-${r.k}`} className={iconBtn} aria-label={`Move criterion ${i + 1} up`} onClick={() => moveRow(i, -1)} disabled={i === 0}>
                    <Icon name="chevronUp" />
                  </button>
                  <span className="mono text-center text-[13px] font-semibold text-muted">{i + 1}</span>
                  <button
                    type="button"
                    id={`down-${r.k}`}
                    className={iconBtn}
                    aria-label={`Move criterion ${i + 1} down`}
                    onClick={() => moveRow(i, 1)}
                    disabled={i === rows.length - 1}
                  >
                    <Icon name="chevronDown" />
                  </button>
                </div>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <label htmlFor={`n-${r.k}`} className="text-[13px] font-semibold text-muted">
                    Criterion name
                  </label>
                  <textarea
                    id={`n-${r.k}`}
                    rows={2}
                    value={r.name}
                    maxLength={NAME_MAX}
                    aria-describedby={`n-${r.k}-limit`}
                    onChange={(e) => patch(i, { name: e.target.value })}
                    className={cn(field, 'font-semibold')}
                  />
                  <LimitHint id={`n-${r.k}-limit`} value={r.name} max={NAME_MAX} />
                  {(fieldErrors[i] ?? []).map((m) => (
                    <p key={m} role="alert" className="m-0 text-[14px] font-semibold text-amber">
                      {m}
                    </p>
                  ))}
                  <Button variant="quiet" className="self-start text-[14px]" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : r.k)}>
                    {isOpen ? 'Hide level descriptions' : 'Edit level descriptions'}
                  </Button>
                </div>
                <div className="col-start-2 flex items-end gap-3 md:col-start-auto md:flex-col md:items-stretch md:gap-1.5">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={`w-${r.k}`} className="text-[13px] font-semibold text-muted">
                      Weight
                    </label>
                    <span className="flex items-center gap-1.5">
                      <input
                        id={`w-${r.k}`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={100}
                        step={1}
                        value={r.weight}
                        onChange={(e) => patch(i, { weight: e.target.value === '' ? '' : Number(e.target.value) })}
                        className={cn(field, 'mono w-[76px] text-right font-semibold')}
                      />
                      <span className="text-muted">%</span>
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`Remove criterion ${i + 1}`}
                  onClick={() => update(rows.filter((_, j) => j !== i))}
                  className="col-start-2 inline-flex size-11 cursor-pointer items-center justify-center self-start rounded-ctl border border-line bg-surface text-ink md:col-start-auto md:mt-[26px]"
                >
                  <Icon name="trash" />
                </button>
                {isOpen && (
                  <div className="col-span-2 grid grid-cols-1 gap-2.5 md:col-start-2 md:col-end-[-1] md:grid-cols-4">
                    {([4, 3, 2, 1] as Level[]).map((l) => (
                      <div key={l} className="flex flex-col gap-1.5">
                        <label htmlFor={`d-${r.k}-${l}`} className={cn('inline-flex h-7 items-center gap-2 self-start whitespace-nowrap rounded-chip px-2.5 text-[13px] font-semibold', FILL[l])}>
                          <LevelBars level={l} />
                          {l} · {LEVEL_NAMES[l]}
                        </label>
                        <textarea
                          id={`d-${r.k}-${l}`}
                          rows={4}
                          value={r.d[l - 1]}
                          maxLength={DESCRIPTION_MAX}
                          onChange={(e) => {
                            const d = [...r.d] as Row['d']
                            d[l - 1] = e.target.value
                            patch(i, { d })
                          }}
                          className={cn(field, 'text-[14px] leading-5')}
                        />
                      </div>
                    ))}
                    <p className="col-span-full m-0 text-[13px] text-muted">Level 0, Not demonstrated, needs no description: it always reads "Not addressed."</p>
                  </div>
                )}
              </li>
            )
          })}
        </ol>
        <div className="border-t border-line px-5 py-4">
          <Button
            variant="ghost"
            disabled={rows.length >= CRITERIA_MAX}
            onClick={() => {
              const k = `new-${Date.now()}`
              update([...rows, { k, id: '', name: '', weight: 0, d: ['', '', '', ''] }])
              setOpen(k)
              setTimeout(() => document.getElementById(`n-${k}`)?.focus(), 0)
            }}
          >
            <Icon name="plus" />
            Add criterion
          </Button>
          {rows.length >= CRITERIA_MAX && <p className="m-0 mt-2 text-[13px] text-muted">A rubric holds at most {CRITERIA_MAX} criteria.</p>}
        </div>
      </Card>
      <div
        role="region"
        aria-label="Weights total and save"
        className="sticky bottom-0 z-[4] flex flex-wrap items-center justify-between gap-4 rounded-card border border-line bg-surface px-5 py-3.5 shadow-[0_-6px_24px_rgba(0,0,0,0.08)]"
      >
        <div className="flex flex-wrap items-center gap-3.5" aria-live="polite">
          <span className="flex items-baseline gap-1.5">
            <span className="text-[14px] text-muted">Weights total</span>
            <span className={cn('mono text-[28px] font-semibold leading-8', ok ? 'text-green' : 'text-amber')}>{total}%</span>
          </span>
          <span className={cn('text-[14px] font-semibold', ok || saved ? 'text-green' : 'text-amber')}>{msg}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => (setDirty(false), navigate(`/rubrics/${assessmentSlug(assessmentKey)}`))}>
            {saved ? 'Back to rubrics' : 'Discard changes'}
          </Button>
          <Button aria-disabled={!ok || undefined} onClick={() => void onSave()} disabled={save.isPending}>
            {saved && !dirty ? 'Saved' : save.isPending ? 'Saving…' : 'Save rubric'}
          </Button>
        </div>
      </div>
      {blocker.state === 'blocked' && (
        <div role="alertdialog" aria-labelledby="leave-h" className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-[520px] flex-col gap-3 rounded-card border-2 border-sel bg-surface p-4 shadow-pop">
          <h2 id="leave-h" className="m-0 text-[16px] font-semibold">
            Leave without saving?
          </h2>
          <p className="m-0 text-[14px]">Your changes to the {a.name} rubric will be lost.</p>
          <div className="flex gap-2">
            <Button onClick={() => blocker.proceed()} autoFocus>
              Leave
            </Button>
            <Button variant="ghost" onClick={() => blocker.reset()}>
              Keep editing
            </Button>
          </div>
        </div>
      )}
      <p className="m-0 text-[13px] text-muted">
        <Link to={`/rubrics/${assessmentSlug(assessmentKey)}`}>View the rubric as reviewers see it</Link>
      </p>
    </Main>
  )
}
