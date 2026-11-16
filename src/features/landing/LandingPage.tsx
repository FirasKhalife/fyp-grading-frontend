import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useAuth } from '@/auth/AuthProvider'
import { oidcEnabled } from '@/auth/oidc'
import { AVATAR_CLASS, canVisit, PERSONAS, type PersonaId } from '@/auth/personas'
import { consumeOvernightReset } from '@/auth/demo-session'
import { cn } from '@/lib/cn'
import { Icon } from '@/components/assay/Icon'
import { useTitle } from '@/components/assay/Page'
import { Wordmark } from '@/components/assay/Wordmark'
import { SkipLink } from '@/components/shell/AppShell'
import { useTheme } from '@/components/shell/theme'

const REPO_URL = 'https://github.com/FirasKhalife/fyp-grading-frontend'
const ARCH_URL = 'https://github.com/FirasKhalife/fyp-grading-docker-compose'

const STEP_FILL = ['bg-l4 text-l4i', 'bg-l3 text-l3i', 'bg-l2 text-l2i']

/** P1: explain the product in one sentence and enter as a persona in one click. */
export function LandingPage() {
  useTitle('')
  const { enterAs, creating, signInWithEmail } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggle } = useTheme()
  const [overnight] = useState(() => consumeOvernightReset())
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState<PersonaId | null>(null)
  const from = (location.state as { from?: string } | null)?.from

  async function enter(id: PersonaId) {
    setBusy(id)
    setError(false)
    try {
      const p = await enterAs(id)
      // The persona sign-in is a password grant, not a redirect, so navigate in both modes.
      navigate(from && canVisit(p, from) ? from : p.home)
    } catch {
      setError(true)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SkipLink />
      {overnight && (
        <div role="status" className="bg-banner text-[14px] text-banner-ink">
          <div className="mx-auto flex min-h-11 max-w-[1280px] flex-wrap items-center gap-2 px-4 py-2 md:px-10">
            <Icon name="check" className="text-green" />
            <strong>Your demo was reset overnight.</strong>
            <span>You're on a fresh copy. Pick a role to continue.</span>
          </div>
        </div>
      )}
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex min-h-[72px] max-w-[1280px] flex-wrap items-center justify-between gap-4 px-4 md:px-10">
          <Link to="/" aria-label="Assay home" className="flex min-h-11 items-center no-underline">
            <Wordmark size="lg" />
          </Link>
          <nav aria-label="Site" className="flex flex-wrap items-center gap-2">
            <a href={ARCH_URL} className="inline-flex min-h-11 items-center gap-1.5 px-3 text-[15px] font-medium text-ink2 no-underline hover:text-pri">
              <Icon name="code" />
              How it's built
            </a>
            {oidcEnabled && (
              <button
                type="button"
                onClick={() => void signInWithEmail().catch(() => setError(true))}
                className="inline-flex min-h-11 cursor-pointer items-center rounded-ctl border border-line bg-surface px-4 text-[15px] font-semibold text-ink hover:border-pri"
              >
                Sign in with email
              </button>
            )}
            <button
              type="button"
              onClick={toggle}
              aria-label={theme === 'dark' ? 'Use the light theme' : 'Use the dark theme'}
              className="inline-flex size-11 cursor-pointer items-center justify-center rounded-ctl border border-line bg-surface text-ink"
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
            </button>
          </nav>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto flex max-w-[1280px] flex-col gap-10 px-4 pb-[72px] pt-8 outline-none md:gap-14 md:px-10 md:pt-16">
        <section className="flex flex-wrap items-start gap-12">
          <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
            <span className="mono text-[13px] text-muted">Final-year project grading · interactive portfolio demo</span>
            <h1 className="m-0 max-w-[760px] text-[32px] font-semibold leading-[38px] tracking-[-0.02em] md:text-[52px] md:leading-[58px]">
              A jury grades a final-year project against one rubric. Assay does the arithmetic and shows students why.
            </h1>
            <p className="m-0 max-w-[680px] text-[18px] leading-7 text-ink2">
              Reviewers click the level description that matches the work. Assay weights each criterion, averages the reviewers into a team grade,
              tracks due dates and defenses, and releases results to students one assessment at a time.
            </p>
          </div>
          <aside aria-labelledby="path-h" className="flex min-w-0 flex-[1_1_360px] flex-col gap-4 rounded-[16px] border border-line bg-surface p-6">
            <h2 id="path-h" className="m-0 text-[16px] font-semibold">
              Follow one grade in five minutes
            </h2>
            <ol className="m-0 flex list-none flex-col gap-3.5 p-0">
              {[
                ['As Jane, jury member:', 'finish the final report draft for Team Beta and submit it.'],
                ['Switch to Rania, coordinator:', 'watch Beta\'s cell turn from "2 of 3" into a grade, then release it.'],
                ['Switch to a student:', "read the grade criterion by criterion, with the jury's comments."],
              ].map(([b, t], i) => (
                <li key={i} className="grid grid-cols-[32px_1fr] items-start gap-3">
                  <span aria-hidden="true" className={cn('mono flex size-8 items-center justify-center rounded-[8px] font-semibold', STEP_FILL[i])}>
                    {i + 1}
                  </span>
                  <span className="text-[15px] leading-[22px]">
                    <strong>{b}</strong> {t}
                  </span>
                </li>
              ))}
            </ol>
            <p className="m-0 text-[13px] leading-[19px] text-muted">Switching role keeps your data, so your own submission follows you.</p>
          </aside>
        </section>

        <section aria-labelledby="roles-h" className="flex flex-col gap-5">
          <h2 id="roles-h" className="m-0 text-[26px] font-semibold">
            Choose a role to enter
          </h2>
          <p className="m-0 flex items-center gap-2 text-[15px] text-ink2">
            <Icon name="lock" size={18} className="text-green" />
            You get a private copy of the demo data. It resets at midnight.
          </p>
          {creating && (
            <p role="status" className="m-0 flex items-center gap-3 rounded-[12px] border border-line bg-surface px-4 py-3">
              <span className="spin border-line2 border-t-pri" aria-hidden="true" />
              <strong>Creating your demo copy…</strong>
              <span className="text-muted">This takes a few seconds.</span>
            </p>
          )}
          {error && (
            <div role="alert" className="flex items-start gap-3 rounded-[12px] border border-amber-line bg-amber-bg p-4">
              <Icon name="warn" size={20} className="flex-none text-amber" />
              <p className="m-0">
                <strong>The demo is starting up, try again in a minute.</strong> The sign-in service didn't answer.
              </p>
            </div>
          )}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5">
            {PERSONAS.map((p) => (
              <article key={p.id} className="flex flex-col gap-4 rounded-[16px] border border-line bg-surface p-6 transition-colors duration-150 hover:border-pri">
                <div className="flex items-center gap-3">
                  <span aria-hidden="true" className={cn('flex size-12 items-center justify-center rounded-full text-[16px] font-semibold', AVATAR_CLASS[p.id])}>
                    {p.firstName[0]}
                    {p.lastName[0]}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-semibold text-pri">{p.roleLabel}</span>
                    <h3 className="m-0 text-[19px] font-semibold">
                      {p.firstName} {p.lastName}
                    </h3>
                  </div>
                </div>
                <p className="m-0 text-[14px] leading-[21px] text-muted">{p.pitch}</p>
                <div className="flex flex-col gap-2">
                  <span className="text-[13px] font-semibold text-ink2">Try</span>
                  <ul className="m-0 flex flex-col gap-1.5 pl-[18px] text-[14px] leading-[21px]">
                    {p.tries.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </div>
                <div className="mt-auto flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => void enter(p.id)}
                    disabled={busy !== null}
                    aria-describedby={`${p.id}-note`}
                    className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-ctl border-0 bg-pri text-[15px] font-semibold text-on-pri transition-colors duration-150 hover:bg-pri-h disabled:cursor-wait"
                  >
                    {busy === p.id ? 'Signing in…' : `Enter as ${p.firstName}`}
                    <Icon name="arrowRight" />
                  </button>
                  <span id={`${p.id}-note`} className="text-center text-[13px] text-muted">
                    {p.landingNote}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="copy-h" className="flex flex-wrap items-start gap-6 border-t border-line pt-8">
          <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-2">
            <h2 id="copy-h" className="m-0 text-[16px] font-semibold">
              About your private copy
            </h2>
            <p className="m-0 text-[15px] leading-[23px] text-ink2">
              Your first click creates a fresh copy of the demo data, just for this browser. Nobody else sees what you grade or release. Every copy is
              deleted at midnight, Paris time, and you can start over at any point with "Reset my demo".
            </p>
          </div>
          <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-2">
            <h2 className="m-0 text-[16px] font-semibold">Good to know</h2>
            <p className="m-0 text-[15px] leading-[23px] text-ink2">
              Clearing your browser data or opening a private window starts a new copy. The demo stores a random session ID, not personal data.
            </p>
          </div>
          <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-1">
            <h2 className="m-0 text-[16px] font-semibold">How it's built</h2>
            <a href={ARCH_URL} className="inline-flex min-h-11 items-center text-[15px] font-medium">
              Architecture overview
            </a>
            <a href={REPO_URL} className="inline-flex min-h-11 items-center text-[15px] font-medium">
              Source on GitHub
            </a>
          </div>
        </section>
      </main>
    </div>
  )
}
