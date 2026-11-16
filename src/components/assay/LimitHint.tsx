/**
 * "120 characters left", shown only near the contract's limit so a long paste is caught before the
 * server refuses it. The field itself also carries `maxLength`.
 */
export function LimitHint({ id, value, max }: { id: string; value: string; max: number }) {
  const left = max - value.length
  if (left > Math.max(100, max * 0.1)) return null
  return (
    <p id={id} aria-live="polite" className={`m-0 text-[13px] ${left <= 0 ? 'font-semibold text-amber' : 'text-muted'}`}>
      {left <= 0 ? `Limit reached: ${max} characters.` : `${left} characters left.`}
    </p>
  )
}
