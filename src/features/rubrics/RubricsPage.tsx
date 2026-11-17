import { Tabs } from 'radix-ui'
import { Link, useNavigate, useParams } from 'react-router'
import { useRubrics } from '@/api/queries'
import { useViewer } from '@/auth/AuthProvider'
import { assessmentFromSlug, assessmentSlug } from '@/domain/assessments'
import { LEVEL_NAMES, LEVEL_ZERO_DESCRIPTION } from '@/domain/levels'
import type { Level } from '@/domain/types'
import { cn } from '@/lib/cn'
import { fmtDayYear, fmtShort, fmtStamp } from '@/lib/demo-clock'
import { Icon } from '@/components/assay/Icon'
import { FILL, LevelBars } from '@/components/assay/LevelMark'
import { Main, PageTitle, useTitle } from '@/components/assay/Page'
import { ErrorState } from '@/components/assay/States'
import { StatusChip } from '@/components/assay/StatusChip'
import { Button } from '@/components/ui/button'
import { Card, Skeleton } from '@/components/ui/card'

const HEAD_LEVELS: Level[] = [4, 3, 2, 1, 0]

/** P7 view: one tab per assessment; a criteria × levels matrix. Reviewers and students see the same page. */
export function RubricsPage() {
  useTitle('Rubrics')
  const { persona } = useViewer()
  const { assessment: slug } = useParams()
  const navigate = useNavigate()
  const q = useRubrics()
  const current = assessmentFromSlug(slug) ?? 'FINAL_PRESENTATION'
  const isAdmin = persona.role === 'COORDINATOR'

  return (
    <Main className="gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <PageTitle>Rubrics</PageTitle>
          <p className="m-0 text-ink2">What the work looks like at each level, for every criterion. Reviewers and students see the same page.</p>
        </div>
        {isAdmin && q.data && (
          <Button asChild>
            <Link to={`/rubrics/${assessmentSlug(current)}/edit`}>
              <Icon name="pencil" />
              Edit {q.data.assessments.find((a) => a.key === current)?.name} rubric
            </Link>
          </Button>
        )}
      </div>
      {q.isPending && (
        <div aria-busy="true" aria-label="Loading rubrics" className="flex flex-col gap-4">
          <Skeleton className="h-12 w-full" />
          <Card className="flex flex-col gap-3 p-5">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </Card>
        </div>
      )}
      {q.isError && (
        <ErrorState title="The rubrics didn't load." actions={<Button onClick={() => void q.refetch()}>Try again</Button>}>
          The server didn't respond. Try again in a moment.
        </ErrorState>
      )}
      {q.isSuccess && (
        <Tabs.Root value={current} onValueChange={(v) => navigate(`/rubrics/${assessmentSlug(v as typeof current)}`, { replace: true })} className="flex flex-col gap-4">
          <Tabs.List aria-label="Assessments" className="flex gap-1 overflow-x-auto border-b border-line">
            {q.data.assessments.map((a) => (
              <Tabs.Trigger
                key={a.key}
                value={a.key}
                className="inline-flex min-h-12 cursor-pointer items-center gap-2 whitespace-nowrap border-0 bg-transparent px-4 text-[15px] font-medium text-ink2 data-[state=active]:font-semibold data-[state=active]:text-ink data-[state=active]:shadow-[inset_0_-3px_0_var(--pri)]"
              >
                {a.name} <span className="mono text-[13px] font-medium text-muted">{a.weight}%</span>
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          {q.data.assessments.map((a) => {
            const r = q.data.rubrics.find((x) => x.assessment === a.key)!
            const total = r.criteria.reduce((s, c) => s + c.weight, 0)
            const edited = q.data.edited[a.key] ?? null
            return (
              <Tabs.Content key={a.key} value={a.key} className="flex flex-col gap-4 outline-none">
                <div className="flex flex-wrap gap-2">
                  <StatusChip kind="plain">Graded by {a.role === 'JURY' ? 'jury' : 'advisor'}</StatusChip>
                  <StatusChip kind="plain">
                    <span className="mono font-semibold">{a.weight}%</span> of the final grade
                  </StatusChip>
                  <StatusChip kind="plain">
                    {r.criteria.length} criteria · weights total <span className="mono font-semibold">{total}%</span>
                  </StatusChip>
                  <StatusChip kind="plain" icon="calendar">
                    {a.key === 'FINAL_PRESENTATION' ? `Defenses · due ${fmtDayYear(a.due)}` : `Due ${fmtShort(a.due)}`}
                    {a.weight === 0 && ' · required'}
                  </StatusChip>
                  {edited && (
                    <StatusChip kind="plain" icon="pencil">
                      Last edited by {edited.by}
                      {edited.at && `, ${fmtStamp(edited.at)}`}
                    </StatusChip>
                  )}
                </div>
                <Card className="overflow-auto">
                  <table className="w-full min-w-[1100px] border-separate border-spacing-0">
                    <caption className="sr-only">{a.name} rubric: criteria by level</caption>
                    <thead>
                      <tr>
                        <th scope="col" className="sticky top-0 z-[1] w-[22%] bg-surface p-3.5 text-left text-[14px]">
                          Criterion
                        </th>
                        {HEAD_LEVELS.map((l) => (
                          <th key={l} scope="col" className={cn('sticky top-0 z-[1] bg-surface p-3.5 text-left', l === 0 ? 'w-[8%]' : 'w-[17%]')}>
                            <span className={cn('inline-flex h-[30px] items-center gap-2 whitespace-nowrap rounded-chip px-2.5 text-[13px] font-semibold', FILL[l])}>
                              <LevelBars level={l} />
                              {l}
                              {l > 0 && ` · ${LEVEL_NAMES[l]}`}
                              {l === 0 && <span className="sr-only">, {LEVEL_NAMES[0]}</span>}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {r.criteria.map((c) => (
                        <tr key={c.id}>
                          <th scope="row" className="border-t border-line p-3.5 text-left align-top text-[14px] font-semibold leading-5">
                            <span className="flex flex-col gap-1">
                              <span className="[overflow-wrap:anywhere]">{c.name}</span>
                              <span className="mono text-[13px] font-medium text-muted">Weight {c.weight}%</span>
                            </span>
                          </th>
                          {[3, 2, 1, 0].map((i) => (
                            <td key={i} className="border-t border-line p-3.5 align-top text-[14px] leading-5 text-ink2">
                              {c.descriptions[i]}
                            </td>
                          ))}
                          <td className="border-t border-line p-3.5 align-top text-[14px] leading-5 text-muted">{LEVEL_ZERO_DESCRIPTION}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
                <p className="m-0 text-[13px] text-muted">
                  Score = Σ (level × weight) ÷ 4, from 0 to 100. A team's assessment grade is the plain average of its reviewers.
                </p>
              </Tabs.Content>
            )
          })}
        </Tabs.Root>
      )}
    </Main>
  )
}
