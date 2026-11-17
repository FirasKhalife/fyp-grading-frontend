import { Popover } from 'radix-ui'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { useResetDemo } from '@/api/queries'
import { useAuth } from '@/auth/AuthProvider'
import { AVATAR_CLASS, PERSONAS, ROLE_SHORT, type PersonaId } from '@/auth/personas'
import { cn } from '@/lib/cn'
import { untilParisMidnight } from '@/lib/demo-clock'
import { Icon } from '../assay/Icon'
import { Button } from '../ui/button'

function useCountdown() {
  const [left, setLeft] = useState(untilParisMidnight)
  useEffect(() => {
    const t = setInterval(() => setLeft(untilParisMidnight()), 30_000)
    return () => clearInterval(t)
  }, [])
  return left
}

/**
 * P2: the demo strip above the app header on every signed-in screen. Dark, so it never reads as
 * part of the product. Reset confirms in place; Switch role keeps the same private copy.
 */
export function DemoBanner() {
  const { persona } = useAuth()
  const [mode, setMode] = useState<'idle' | 'confirm' | 'resetting'>('idle')
  const reset = useResetDemo()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const left = useCountdown()

  if (!persona) return null

  async function doReset() {
    setMode('resetting')
    try {
      await reset.mutateAsync()
      await signOut()
      navigate('/', { replace: true, state: { fresh: true } })
      toast.success('Fresh copy ready. Pick a role to continue.')
    } catch (e) {
      setMode('idle')
      // e.g. 429: "That was a lot of requests in a short time. Try again in 40 seconds."
      toast.error(e instanceof ApiError ? `The reset didn't go through. ${e.message}` : "The reset didn't go through. Try again in a moment.")
    }
  }

  return (
    <div role="region" aria-label="Demo" className="bg-banner text-[14px] text-banner-ink [&_:focus-visible]:outline-banner-accent">
      <div className="mx-auto flex min-h-11 max-w-[1360px] flex-wrap items-center justify-between gap-x-6 px-4 md:px-10">
        {mode === 'idle' && (
          <>
            <p className="m-0 flex flex-wrap items-center gap-2 py-2">
              <Icon name="lock" className="text-banner-accent" />
              <strong>Private demo</strong>
              <span aria-hidden="true" className="text-banner-muted">
                ·
              </span>
              <span>
                <span className="hidden md:inline">signed in as </span>
                {persona.firstName} {persona.lastName} ({ROLE_SHORT[persona.role]})
              </span>
              <span className="hidden text-banner-muted md:inline">· resets at midnight, Paris time, in {left}</span>
            </p>
            <div className="flex items-center gap-1">
              <RoleSwitcher left={left} />
              <Button variant="onBanner" className="rounded-[8px] px-3.5 text-[14px]" onClick={() => setMode('confirm')}>
                Reset my demo
              </Button>
            </div>
          </>
        )}
        {mode === 'confirm' && (
          <>
            <p role="alert" className="m-0 flex flex-wrap items-center gap-2 py-2">
              <Icon name="warn" className="text-[#F0A65E]" />
              <strong>Reset your demo?</strong>
              <span>Everything you graded, released or changed in this copy is deleted, and you start again from the original demo data.</span>
            </p>
            <div className="flex items-center gap-2">
              <Button variant="bannerLink" className="text-[14px]" onClick={() => setMode('idle')} autoFocus>
                Cancel
              </Button>
              <Button variant="bannerSolid" className="rounded-[8px] px-3 text-[14px]" onClick={() => void doReset()}>
                Reset my demo
              </Button>
            </div>
          </>
        )}
        {mode === 'resetting' && (
          <p role="status" className="m-0 flex min-h-11 flex-wrap items-center gap-2 py-2">
            <span className="spin" aria-hidden="true" />
            <strong>Creating a fresh copy of the demo data…</strong>
            <span className="text-banner-muted">This takes a few seconds.</span>
          </p>
        )}
      </div>
    </div>
  )
}

function RoleSwitcher({ left }: { left: string }) {
  const { persona, enterAs } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  async function pick(id: PersonaId) {
    setOpen(false)
    if (id === persona?.id) return
    const p = await enterAs(id)
    navigate(p.home)
    toast(`Signed in as ${p.firstName} ${p.lastName}. Same private copy.`)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button variant="bannerLink" className="text-[14px]">
          Switch role
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          collisionPadding={12}
          aria-label="Switch role"
          className="z-50 flex w-[min(440px,calc(100vw-24px))] flex-col gap-2.5 rounded-card border border-line bg-surface p-4 text-ink shadow-pop"
        >
          <p className="m-0 font-semibold">Switch role</p>
          <p className="m-0 text-[13px] leading-[19px] text-muted">
            Same private copy: anything you graded or released stays. Resets at midnight, Paris time, in {left}.
          </p>
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {PERSONAS.map((p) => {
              const cur = p.id === persona?.id
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => void pick(p.id)}
                    aria-current={cur ? 'true' : undefined}
                    className={cn(
                      'flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-[12px] border border-line bg-surface px-3.5 py-2.5 text-left text-ink transition-colors hover:border-pri',
                      cur && 'border-2 border-pri bg-pri-soft',
                    )}
                  >
                    <span aria-hidden="true" className={cn('flex size-10 flex-none items-center justify-center rounded-full text-[14px] font-semibold', AVATAR_CLASS[p.id])}>
                      {p.firstName[0]}
                      {p.lastName[0]}
                    </span>
                    <span className="flex flex-col">
                      <strong>
                        {p.firstName} {p.lastName}
                        {cur && <span className="font-medium text-muted"> · current</span>}
                      </strong>
                      <span className="text-[13px] text-muted">{p.switcherNote}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
