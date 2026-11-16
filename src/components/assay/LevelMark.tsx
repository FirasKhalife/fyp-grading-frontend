import { bandOf, LEVEL_NAMES } from '@/domain/levels'
import type { Level } from '@/domain/types'
import { cn } from '@/lib/cn'
import { formatScore } from '@/lib/scoring'

/**
 * The level mark. Three cues, always together: ascending bars (filled count = level; empty bars are
 * outlined, not faded), the numeral, and the name where there's room. Colour is a fourth cue.
 */

const SIZES = {
  sm: { w: 4, h: [5, 8, 11, 14], gap: 2, box: 14 },
  lg: { w: 6, h: [8, 13, 18, 23], gap: 3, box: 24 },
} as const

export function LevelBars({ level, size = 'sm', className }: { level: Level; size?: keyof typeof SIZES; className?: string }) {
  const s = SIZES[size]
  return (
    <span aria-hidden="true" className={cn('inline-flex flex-none items-end', className)} style={{ gap: s.gap, height: s.box }}>
      {s.h.map((h, i) => (
        <i
          key={i}
          className={cn('block rounded-[1px]', i < level ? 'bg-current' : 'border-[1.5px] border-current')}
          style={{ width: s.w, height: h }}
        />
      ))}
    </span>
  )
}

export const FILL: Record<Level, string> = { 4: 'f4', 3: 'f3', 2: 'f2', 1: 'f1', 0: 'f0' }

interface LevelMarkProps {
  level: Level
  /** Show the level name after the numeral. */
  showName?: boolean
  /** Text to show instead of the numeral (e.g. "4 · Exemplary" or a reviewer's initials). */
  prefix?: string
  className?: string
  label?: string
}

/** A filled chip: bars + numeral (+ name). Used in tables, results and headings. */
export function LevelMark({ level, showName = false, prefix, className, label }: LevelMarkProps) {
  return (
    <span
      className={cn(
        'inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-chip px-2 text-[13px] font-semibold',
        FILL[level],
        className,
      )}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      {prefix && <span className="font-medium opacity-90">{prefix}</span>}
      <LevelBars level={level} />
      <span className="mono">{level}</span>
      {showName && <span>{LEVEL_NAMES[level]}</span>}
    </span>
  )
}

interface ScoreChipProps {
  score: number
  /** "band": show "Exemplary band" after the score; "name": the band name only (no score). */
  variant?: 'score' | 'band' | 'bandOnly'
  className?: string
  /** Prefix for the accessible label, e.g. "My score". */
  labelPrefix?: string
}

/** A 0–100 score carries the mark of its band: 0–12.4 → 0 … 87.5–100 → 4. */
export function ScoreChip({ score, variant = 'score', className, labelPrefix }: ScoreChipProps) {
  const band = bandOf(score)
  const s = formatScore(score)
  const label = `${labelPrefix ? `${labelPrefix} ` : ''}${s}, ${LEVEL_NAMES[band]} band`
  return (
    <span
      role="img"
      aria-label={label}
      className={cn('inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-chip px-2.5 text-[14px] font-semibold', FILL[band], className)}
    >
      <LevelBars level={band} />
      {variant === 'bandOnly' ? (
        <span>{LEVEL_NAMES[band]} band</span>
      ) : (
        <>
          <span className="mono">{s}</span>
          {variant === 'band' && <span className="font-medium">· {LEVEL_NAMES[band]}</span>}
        </>
      )}
    </span>
  )
}
