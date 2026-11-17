import { Link } from 'react-router'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Insights as InsightsView } from '@/api/views'
import { bandOf, LEVEL_NAMES } from '@/domain/levels'
import { formatScore } from '@/lib/scoring'
import { Icon } from '@/components/assay/Icon'
import { LevelBars } from '@/components/assay/LevelMark'
import { Card } from '@/components/ui/card'

/**
 * P5 insights (contract `Overview.insights`): how the final grades are spread, and where reviewers
 * disagree by more than the threshold. Informational only: nothing here reopens or changes a grade.
 */
export function Insights({ data }: { data: InsightsView }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] gap-6">
      <Distribution bands={data.distribution} />
      <Disagreements items={data.disagreements} threshold={data.threshold} />
    </div>
  )
}

type Band = InsightsView['distribution'][number]

const label = (b: Band) => `${b.from}–${b.to}`
const teams = (n: number) => `${n} team${n === 1 ? '' : 's'}`

function Distribution({ bands }: { bands: Band[] }) {
  const total = bands.reduce((s, b) => s + b.count, 0)
  const used = bands.filter((b) => b.count > 0)
  const top = Math.max(1, ...bands.map((b) => b.count))
  const summary =
    used.length === 1
      ? `All of them are in the ${label(used[0]!)} band.`
      : used.length > 1
        ? `They range from the ${label(used[0]!)} band to the ${label(used[used.length - 1]!)} band.`
        : ''
  return (
    <Card as="section" aria-labelledby="dist-h" className="flex min-w-0 flex-col gap-3 p-5">
      <div className="flex flex-col gap-0.5">
        <h2 id="dist-h" className="m-0 text-[16px] font-semibold">
          Final grade distribution
        </h2>
        <p className="m-0 text-[13px] text-muted">
          {total ? `${teams(total)} with a final grade, in 10-point bands.` : 'Appears once a team has all five assessments final.'}
        </p>
      </div>
      {total > 0 ? (
        <figure className="m-0 flex flex-col gap-2">
          {/* The chart is for sighted users; the table below carries the same numbers for everyone else. */}
          <div aria-hidden="true" className="h-44 w-full text-muted">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bands} margin={{ top: 8, right: 4, bottom: 0, left: -24 }} barCategoryGap={2} accessibilityLayer={false}>
                <XAxis dataKey="from" tickLine={false} axisLine={{ stroke: 'var(--line)' }} tick={{ fill: 'var(--muted)', fontSize: 11 }} interval={0} />
                <YAxis allowDecimals={false} domain={[0, top]} tickCount={Math.min(top, 4) + 1} tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} width={40} />
                <Tooltip cursor={{ fill: 'var(--raised)' }} content={<BandTip />} isAnimationActive={false} />
                <Bar dataKey="count" fill="var(--pri)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <figcaption className="text-[13px] text-ink2">
            {summary} Each bar is a 10-point band, labelled by where it starts.
          </figcaption>
          <table className="sr-only">
            <caption>Final grades per 10-point band</caption>
            <thead>
              <tr>
                <th scope="col">Band</th>
                <th scope="col">Teams</th>
              </tr>
            </thead>
            <tbody>
              {bands.map((b) => (
                <tr key={b.from}>
                  <th scope="row">{label(b)}</th>
                  <td>{b.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </figure>
      ) : (
        <p className="m-0 text-[14px] text-ink2">No final grade yet.</p>
      )}
    </Card>
  )
}

function BandTip({ active, payload }: { active?: boolean; payload?: { payload: Band }[] }) {
  const b = active ? payload?.[0]?.payload : undefined
  if (!b) return null
  const level = bandOf(Math.min(100, b.from + 5))
  return (
    <div className="flex items-center gap-2 rounded-ctl border border-line bg-surface px-2.5 py-1.5 text-[13px] text-ink shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
      <LevelBars level={level} className="text-pri" />
      <span>
        <span className="mono font-semibold">{label(b)}</span> · {teams(b.count)}
        <span className="text-muted"> · {LEVEL_NAMES[level]} band</span>
      </span>
    </div>
  )
}

function Disagreements({ items, threshold }: { items: InsightsView['disagreements']; threshold: number }) {
  return (
    <Card as="section" aria-labelledby="dis-h" className="flex min-w-0 flex-col gap-3 p-5">
      <div className="flex flex-col gap-0.5">
        <h2 id="dis-h" className="m-0 text-[16px] font-semibold">
          Reviewers disagree <span className="mono font-medium text-muted">{items.length}</span>
        </h2>
        <p className="m-0 text-[13px] text-muted">
          Submitted scores more than {threshold} points apart, largest first. Informational only: the grade is always the plain average.
        </p>
      </div>
      {items.length ? (
        <ul className="m-0 list-none p-0">
          {items.map((d, i) => (
            <li key={`${d.team.id}-${d.assessment.key}`} className={i > 0 ? 'border-t border-line' : undefined}>
              <Link
                to={`/teams/${d.team.id}#${d.assessment.key.toLowerCase()}`}
                className="flex min-h-11 flex-wrap items-center justify-between gap-2 py-2.5 text-ink no-underline hover:underline"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="font-semibold">Team {d.team.name}</span>
                  <span className="text-[13px] text-muted">
                    {d.assessment.name} · {d.submitted} submitted
                  </span>
                </span>
                <span className="inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-chip border border-amber-line bg-amber-bg px-2.5 text-[13px] font-semibold text-amber">
                  <Icon name="swap" size={14} />
                  <span>
                    <span className="mono">{formatScore(d.spread)}</span> points apart
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-[14px] text-ink2">No disagreements. Every assessment with two or more submissions is within {threshold} points.</p>
      )}
    </Card>
  )
}
