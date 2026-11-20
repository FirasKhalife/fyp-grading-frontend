import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { as?: 'div' | 'section' | 'article' | 'aside' }>(function Card(
  { className, as: As = 'div', ...props },
  ref,
) {
  return <As ref={ref} className={cn('rounded-card border border-line bg-surface', className)} {...props} />
})

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <span aria-hidden="true" className={cn('sk', className)} style={style} />
}
