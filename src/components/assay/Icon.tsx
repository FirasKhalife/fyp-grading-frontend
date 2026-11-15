import type { SVGProps } from 'react'

/** The icon set drawn on the design boards (16 × 16 grid, 1.6 px strokes). */
const PATHS = {
  lock: (
    <>
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 015 0v2" />
    </>
  ),
  pencil: <path d="M10.5 2.5l3 3L6 13H3v-3z" strokeLinejoin="round" />,
  circle: <circle cx="8" cy="8" r="5.5" />,
  circleDashed: <circle cx="8" cy="8" r="5.5" strokeDasharray="2.5 2" />,
  clock: (
    <>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.5V8l2.5 1.5" strokeLinecap="round" />
    </>
  ),
  half: (
    <>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 2a6 6 0 010 12z" fill="currentColor" />
    </>
  ),
  eye: (
    <>
      <path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" />
      <circle cx="8" cy="8" r="2" />
    </>
  ),
  calendar: (
    <>
      <rect x="2" y="3" width="12" height="11" rx="1.5" />
      <path d="M2 6.5h12M5 1.5v3M11 1.5v3" />
    </>
  ),
  check: <path d="M3 8.5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} />,
  plus: <path d="M8 3v10M3 8h10" strokeLinecap="round" strokeWidth={1.8} />,
  arrowRight: <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} />,
  bell: <path d="M4 11V7a4 4 0 018 0v4l1.5 1.5h-11zM6.5 14h3" strokeLinecap="round" strokeLinejoin="round" />,
  menu: <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" strokeLinecap="round" />,
  table: (
    <>
      <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
      <path d="M2 6.5h12M6 6.5v7" />
    </>
  ),
  download: <path d="M8 2v8M4.5 6.5L8 10l3.5-3.5M2.5 13.5h11" strokeLinecap="round" strokeLinejoin="round" />,
  warn: <path d="M8 2l6.5 11.5h-13zM8 6.5v3M8 11.5v.01" strokeLinecap="round" strokeLinejoin="round" />,
  x: <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />,
  chevronDown: <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} />,
  chevronUp: <path d="M4 10l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} />,
  trash: <path d="M3 4.5h10M6.5 4.5V3h3v1.5M5 4.5l.6 8.5h4.8l.6-8.5" strokeLinecap="round" strokeLinejoin="round" />,
  people: (
    <>
      <circle cx="6" cy="5.5" r="2.5" />
      <path d="M1.5 13.5c.6-2.4 2.3-3.5 4.5-3.5s3.9 1.1 4.5 3.5M11 3.5a2.2 2.2 0 010 4.2M12.5 10.3c1 .5 1.7 1.6 2 3.2" strokeLinecap="round" />
    </>
  ),
  code: <path d="M5.5 4.5L2 8l3.5 3.5M10.5 4.5L14 8l-3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />,
  pause: <path d="M5 3v10M11 3v10" strokeLinecap="round" strokeWidth={1.8} />,
  sun: (
    <>
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1" strokeLinecap="round" />
    </>
  ),
  moon: <path d="M13 9.5A5.5 5.5 0 016.5 3a5.5 5.5 0 106.5 6.5z" strokeLinejoin="round" />,
  logout: <path d="M6 2.5H3.5v11H6M10 5l3 3-3 3M13 8H6" strokeLinecap="round" strokeLinejoin="round" />,
  refresh: <path d="M13 3v3.5H9.5M3 13V9.5h3.5M12.4 6.5A5 5 0 003.8 5M3.6 9.5a5 5 0 008.6 1.5" strokeLinecap="round" strokeLinejoin="round" />,
  swap: <path d="M3 5.5h9.5L10 3M13 10.5H3.5L6 13" strokeLinecap="round" strokeLinejoin="round" />,
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 16, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true" focusable="false" {...rest}>
      {PATHS[name]}
    </svg>
  )
}
