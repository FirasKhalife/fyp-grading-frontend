import { cn } from '@/lib/cn'

/** The hallmark: a stamp holding the four level bars, all filled. */
export function Glyph({ size = 24, strokeWidth = 3.5, className }: { size?: number; strokeWidth?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" focusable="false" className={className}>
      <rect x="1.5" y="1.5" width="37" height="37" rx="9" fill="none" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M8 23h4.5v8H8zM14.5 19H19v12h-4.5zM21 15h4.5v16H21zM27.5 11H32v20h-4.5z" fill="currentColor" />
    </svg>
  )
}

/** Lowercase "assay" in Plex Sans Semibold, tracking −2 to −3 %. */
export function Wordmark({ size = 'md', className }: { size?: 'md' | 'lg'; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-logo', className)}>
      <Glyph size={size === 'lg' ? 26 : 24} />
      <b className={cn('font-semibold tracking-[-0.02em] text-ink', size === 'lg' ? 'text-[22px]' : 'text-[20px]')}>assay</b>
    </span>
  )
}
