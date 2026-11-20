import { countsTowardFinal, weightLabel } from '@/lib/weight'

/** "<b>30%</b> of final grade" with the number in mono, or "Required · not counted in the final grade". */
export function WeightPhrase({ weight }: { weight: number }) {
  if (!countsTowardFinal(weight)) return <>{weightLabel(weight)}</>
  return (
    <>
      <span className="mono font-semibold">{weight}%</span> of final grade
    </>
  )
}
