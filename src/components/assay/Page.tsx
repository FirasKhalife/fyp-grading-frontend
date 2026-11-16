import { Fragment, useEffect, type ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from '@/lib/cn'

/** Sets the document title: "<page> · Assay". */
export function useTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · Assay` : 'Assay'
  }, [title])
}

export function Breadcrumb({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0 text-[14px]">
        {items.map((it, i) => (
          <Fragment key={i}>
            {i > 0 && (
              <li aria-hidden="true" className="text-muted">
                /
              </li>
            )}
            {it.to ? (
              <li>
                <Link to={it.to} className="inline-flex min-h-11 items-center">
                  {it.label}
                </Link>
              </li>
            ) : (
              <li aria-current="page" className="text-ink2">
                {it.label}
              </li>
            )}
          </Fragment>
        ))}
      </ol>
    </nav>
  )
}

export function PageTitle({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <h1 id={id} className={cn('m-0 text-[28px] font-semibold leading-[34px] tracking-[-0.02em] md:text-[36px] md:leading-[44px]', className)}>
      {children}
    </h1>
  )
}

/** The page container shared by every signed-in screen. */
export function Main({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main id="main" tabIndex={-1} className={cn('mx-auto flex w-full max-w-[1360px] flex-col gap-6 px-4 pb-20 pt-7 outline-none md:px-10', className)}>
      {children}
    </main>
  )
}

/** Visually hidden but read by screen readers. */
export function SrOnly({ children }: { children: ReactNode }) {
  return <span className="sr-only">{children}</span>
}
