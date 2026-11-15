import { RadioGroup } from 'radix-ui'
import { LEVEL_NAMES, LEVEL_ZERO_DESCRIPTION, LEVELS } from '@/domain/levels'
import type { Criterion, Level } from '@/domain/types'
import { cn } from '@/lib/cn'
import { Icon } from '@/components/assay/Icon'
import { LevelBars } from '@/components/assay/LevelMark'

const CHECKED: Record<Level, string> = {
  4: 'data-[state=checked]:bg-l4 data-[state=checked]:text-l4i',
  3: 'data-[state=checked]:bg-l3 data-[state=checked]:text-l3i',
  2: 'data-[state=checked]:bg-l2 data-[state=checked]:text-l2i',
  1: 'data-[state=checked]:bg-l1 data-[state=checked]:text-l1i',
  0: 'data-[state=checked]:bg-raised data-[state=checked]:border-dashed data-[state=checked]:border-l0b',
}
const TICK: Record<Level, string> = { 4: 'text-l4', 3: 'text-l3', 2: 'text-l2', 1: 'text-l1', 0: 'text-raised' }

/**
 * The level picker: a Radix radio group whose items are cards showing bars, numeral, name and the
 * level description. Order 4 → 0. Arrow keys move between levels; Tab moves to the next criterion.
 */
export function LevelPicker({
  criterion,
  value,
  onChange,
  locked,
  labelledBy,
}: {
  criterion: Criterion
  value: Level | null
  onChange: (l: Level) => void
  locked: boolean
  labelledBy: string
}) {
  return (
    <RadioGroup.Root
      aria-labelledby={labelledBy}
      value={value === null ? '' : String(value)}
      onValueChange={(v) => onChange(Number(v) as Level)}
      disabled={locked}
      className="grid grid-cols-1 gap-2 md:grid-cols-5"
    >
      {LEVELS.map((l) => {
        const desc = l === 0 ? LEVEL_ZERO_DESCRIPTION : criterion.descriptions[l - 1]
        return (
          <RadioGroup.Item
            key={l}
            value={String(l)}
            aria-label={`${l}, ${LEVEL_NAMES[l]}: ${desc}`}
            className={cn(
              'group relative grid min-h-11 cursor-pointer grid-cols-[auto_1fr] items-center gap-x-3 gap-y-0.5 rounded-ctl border border-line bg-surface p-3 pb-3.5 text-left text-ink transition-colors duration-150 hover:border-pri',
              'md:flex md:flex-col md:items-stretch md:gap-1.5',
              'data-[state=checked]:border-2 data-[state=checked]:border-sel data-[state=checked]:p-[11px] data-[state=checked]:pb-[13px]',
              'disabled:cursor-default disabled:hover:border-line data-[state=checked]:disabled:hover:border-sel disabled:[&:not([data-state=checked])]:opacity-55',
              CHECKED[l],
            )}
          >
            <span className="row-span-2 flex items-center justify-between gap-1.5">
              <span className="inline-flex items-center gap-2">
                <LevelBars level={l} />
                <span className="mono text-[15px] font-semibold">{l}</span>
              </span>
              <span aria-hidden="true" className="hidden size-5 items-center justify-center rounded-full bg-current group-data-[state=checked]:md:inline-flex">
                <Icon name="check" size={12} strokeWidth={2.4} className={TICK[l]} />
              </span>
            </span>
            <span className="text-[14px] font-semibold leading-[19px]">{LEVEL_NAMES[l]}</span>
            <span className="col-start-2 text-[14px] leading-5 text-muted group-data-[state=checked]:text-inherit md:text-[13px] md:leading-[19px]">{desc}</span>
          </RadioGroup.Item>
        )
      })}
    </RadioGroup.Root>
  )
}
