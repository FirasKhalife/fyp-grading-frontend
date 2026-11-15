import { useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router'
import type { GridRow, TeamAssessmentInfo } from '@/api/views'
import { bandOf, LEVEL_NAMES } from '@/domain/levels'
import { cn } from '@/lib/cn'
import { daysFromToday, fmtShort } from '@/lib/demo-clock'
import { formatScore } from '@/lib/scoring'
import { Icon } from '@/components/assay/Icon'
import { FILL, LevelBars } from '@/components/assay/LevelMark'
import type { Assessment } from '@/domain/types'

export interface CellModel {
  kind: 'grade' | 'wait' | 'overdue' | 'todo'
  main: string
  note: string
  band: number | null
  released: boolean
  aria: string
}

export function cellModel(row: GridRow, c: TeamAssessmentInfo): CellModel {
  const a = c.assessment
  const t = row.team
  if (c.grade !== null) {
    const b = bandOf(c.grade)
    const note = `${c.release ? 'Released' : 'Final'}${c.spread !== null && c.spread >= 20 ? ` · spread ${formatScore(c.spread)}` : ''}`
    return {
      kind: 'grade',
      main: formatScore(c.grade),
      note,
      band: b,
      released: !!c.release,
      aria: `${formatScore(c.grade)} ${note}. Team ${t.name}, ${a.name}, ${LEVEL_NAMES[b]} band`,
    }
  }
  if (c.overdue) {
    const draft = c.drafts > 0
    const note = `${draft ? 'Draft' : 'Not started'} · due ${fmtShort(a.due)}`
    return { kind: 'overdue', main: 'Overdue', note, band: null, released: false, aria: `Overdue ${note}. Team ${t.name}, ${a.name}` }
  }
  let note = `Due ${fmtShort(a.due)}`
  if (a.key === 'FINAL_PRESENTATION' && t.defense) {
    const d = daysFromToday(t.defense.start)
    note = d === 0 ? 'Defended today' : d > 0 ? `Defense ${fmtShort(t.defense.start)}` : note
  }
  const main = `${c.submitted} of ${c.expected}`
  return {
    kind: c.submitted > 0 ? 'wait' : 'todo',
    main,
    note,
    band: null,
    released: false,
    aria: `${main} ${note}. Team ${t.name}, ${a.name}, ${main} reviewers submitted`,
  }
}

const CELL = 'flex h-full min-h-[62px] flex-col justify-center gap-1 rounded-[8px] border border-transparent px-2.5 py-2 no-underline hover:outline-2 hover:outline-offset-1 hover:outline-pri'

/**
 * The team × assessment grid: a real <table> of links with roving focus. Tab enters the grid once;
 * arrow keys move between cells, Home/End jump within a row.
 */
export function GradeGrid({ rows, cols, releaseCounts }: { rows: GridRow[]; cols: Assessment[]; releaseCounts: Record<string, number> }) {
  const [pos, setPos] = useState<[number, number]>([0, 0])
  const refs = useRef<Map<string, HTMLAnchorElement>>(new Map())
  const width = cols.length + 2 // row header + assessments + final

  function move(r: number, c: number) {
    const nr = Math.max(0, Math.min(rows.length - 1, r))
    const nc = Math.max(0, Math.min(width - 1, c))
    setPos([nr, nc])
    refs.current.get(`${nr}:${nc}`)?.focus()
  }

  function onKey(e: KeyboardEvent, r: number, c: number) {
    const map: Record<string, () => void> = {
      ArrowRight: () => move(r, c + 1),
      ArrowLeft: () => move(r, c - 1),
      ArrowDown: () => move(r + 1, c),
      ArrowUp: () => move(r - 1, c),
      Home: () => move(e.ctrlKey ? 0 : r, 0),
      End: () => move(e.ctrlKey ? rows.length - 1 : r, width - 1),
    }
    const fn = map[e.key]
    if (fn) {
      e.preventDefault()
      fn()
    }
  }

  const [pr, pc] = pos[0] < rows.length ? pos : [0, 0]
  const cellProps = (r: number, c: number) => ({
    ref: (el: HTMLAnchorElement | null) => {
      if (el) refs.current.set(`${r}:${c}`, el)
      else refs.current.delete(`${r}:${c}`)
    },
    tabIndex: r === pr && c === pc ? 0 : -1,
    onKeyDown: (e: KeyboardEvent) => onKey(e, r, c),
    onFocus: () => setPos([r, c]),
  })

  return (
    <div className="-mx-1.5 overflow-x-auto">
      <table className="w-full min-w-[860px] border-separate border-spacing-1.5">
        <caption className="px-1.5 pb-1.5 text-left text-[13px] text-muted">
          Each cell is the team's grade for that assessment, with its level band. Open a cell for the reviewer breakdown. Arrow keys move between
          cells.
        </caption>
        <thead>
          <tr>
            <th scope="col" className="w-[200px] px-1 pb-1 text-left align-bottom text-[13px] font-semibold text-ink2">
              Team
            </th>
            {cols.map((a) => {
              const n = releaseCounts[a.key] ?? 0
              return (
                <th key={a.key} scope="col" className="px-1 pb-1 text-left align-bottom text-[13px] font-semibold text-ink2">
                  <span className="flex flex-col gap-0.5">
                    <span>
                      {a.shortName} <span className="mono font-medium text-muted">{a.weight}%</span>
                    </span>
                    <span className={cn('inline-flex items-center gap-1 text-[12px] font-medium', n < rows.length && 'text-muted')}>
                      <Icon name="eye" size={12} />
                      Released {n} of {rows.length}
                    </span>
                  </span>
                </th>
              )
            })}
            <th scope="col" className="px-1 pb-1 text-left align-bottom text-[13px] font-semibold text-ink2">
              Final grade
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={row.team.id}>
              <th scope="row" className="px-1 py-0 text-left align-middle">
                <Link
                  to={`/teams/${row.team.id}`}
                  {...cellProps(r, 0)}
                  className="flex min-h-11 flex-col justify-center gap-0.5 rounded-[6px] text-ink no-underline hover:text-ink hover:underline"
                >
                  <span className="text-[15px] font-semibold">Team {row.team.name}</span>
                  <span className="text-[12px] font-normal leading-4 text-muted">{row.team.projectTitle}</span>
                </Link>
              </th>
              {row.cells.map((c, i) => {
                const m = cellModel(row, c)
                return (
                  <td key={c.assessment.key} className="h-px p-0 align-top">
                    <Link
                      to={`/teams/${row.team.id}#${c.assessment.key.toLowerCase()}`}
                      aria-label={m.aria}
                      {...cellProps(r, i + 1)}
                      className={cn(
                        CELL,
                        m.kind === 'grade' && FILL[m.band as 0],
                        m.kind === 'grade' && 'hover:text-current',
                        m.kind === 'wait' && 'border-dashed border-faint bg-surface text-ink2 hover:text-ink2',
                        m.kind === 'overdue' && 'border-amber-line bg-amber-soft text-amber hover:text-amber',
                        m.kind === 'todo' && 'border-line bg-surface text-muted hover:text-muted',
                      )}
                    >
                      <span className="flex items-center justify-between gap-1.5">
                        <span className="mono text-[17px] font-semibold">{m.main}</span>
                        {m.band !== null && <LevelBars level={m.band as 0} />}
                      </span>{' '}
                      <span className="inline-flex items-center gap-1 text-[12px] font-medium leading-4">
                        {m.released && <Icon name="eye" size={12} />}
                        {m.kind === 'overdue' && <Icon name="clock" size={12} />}
                        {m.kind === 'wait' && <Icon name="half" size={12} />}
                        {m.note}
                      </span>
                    </Link>
                  </td>
                )
              })}
              <td className="h-px p-0 align-top">
                <Link
                  to={`/teams/${row.team.id}`}
                  {...cellProps(r, width - 1)}
                  aria-label={
                    row.final !== null
                      ? `${formatScore(row.final)} ${row.finalVisible ? 'Visible to students' : 'Computed · not visible yet'}. Team ${row.team.name} final grade, ${LEVEL_NAMES[bandOf(row.final)]} band`
                      : `Pending ${row.needs}. Team ${row.team.name} final grade`
                  }
                  className={cn(
                    CELL,
                    row.final !== null ? cn(FILL[bandOf(row.final)], 'hover:text-current') : 'border-line bg-surface text-muted hover:text-muted',
                  )}
                >
                  <span className="flex items-center justify-between gap-1.5">
                    <span className="mono text-[17px] font-semibold">{row.final !== null ? formatScore(row.final) : 'Pending'}</span>
                    {row.final !== null && <LevelBars level={bandOf(row.final)} />}
                  </span>{' '}
                  <span className="inline-flex items-center gap-1 text-[12px] font-medium leading-4">
                    {row.final !== null && row.finalVisible && <Icon name="eye" size={12} />}
                    {row.final !== null ? (row.finalVisible ? 'Visible to students' : 'Computed · not visible yet') : row.needs}
                  </span>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
