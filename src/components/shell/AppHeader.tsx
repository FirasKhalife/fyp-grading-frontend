import { DropdownMenu } from 'radix-ui'
import { Link, NavLink, useNavigate } from 'react-router'
import { useAuth } from '@/auth/AuthProvider'
import { AVATAR_CLASS, type Persona } from '@/auth/personas'
import { cn } from '@/lib/cn'
import { Icon } from '../assay/Icon'
import { Wordmark } from '../assay/Wordmark'
import { NotificationsBell } from './NotificationsBell'
import { useTheme } from './theme'

export function navFor(p: Persona): { to: string; label: string }[] {
  switch (p.role) {
    case 'COORDINATOR':
      return [
        { to: '/overview', label: 'Overview' },
        { to: '/teams', label: 'Teams' },
        { to: '/rubrics', label: 'Rubrics' },
        { to: '/schedule', label: 'Schedule' },
        { to: '/my-teams', label: 'My grading' },
      ]
    case 'STUDENT':
      return [
        { to: '/student', label: 'My team' },
        { to: '/rubrics', label: 'Rubrics' },
        { to: '/schedule', label: 'Schedule' },
      ]
    default:
      return [
        { to: '/my-teams', label: 'My teams' },
        { to: '/rubrics', label: 'Rubrics' },
        { to: '/schedule', label: 'Schedule' },
      ]
  }
}

const menuItem =
  'flex min-h-11 cursor-pointer select-none items-center gap-2.5 rounded-[8px] px-3 text-[15px] text-ink outline-none data-[highlighted]:bg-raised data-[highlighted]:outline-[3px] data-[highlighted]:outline-sel data-[highlighted]:-outline-offset-[3px]'
const menuPanel = 'z-50 min-w-[240px] rounded-card border border-line bg-surface p-1.5 text-ink shadow-pop'

export function AppHeader() {
  const { persona, signOut } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  if (!persona) return null
  const nav = navFor(persona)
  const ini = `${persona.firstName[0]}${persona.lastName[0]}`

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex min-h-16 max-w-[1360px] items-center justify-between gap-4 px-4 md:px-10">
        <div className="flex items-center gap-7">
          <Link to={persona.home} aria-label="Assay home" className="flex min-h-11 items-center no-underline">
            <Wordmark />
          </Link>
          <nav aria-label="Main" className="hidden gap-1 md:flex">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  cn(
                    'inline-flex min-h-11 items-center px-3 font-medium text-ink2 no-underline hover:text-ink',
                    isActive && 'font-semibold text-ink shadow-[inset_0_-3px_0_var(--pri)]',
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <NotificationsBell />
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                aria-label={`${ini}, account menu for ${persona.firstName} ${persona.lastName}`}
                className={cn(
                  'inline-flex size-11 flex-none cursor-pointer items-center justify-center rounded-full border-0 font-semibold',
                  AVATAR_CLASS[persona.id],
                )}
              >
                {ini}
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content align="end" sideOffset={8} className={menuPanel}>
                <DropdownMenu.Label className="px-3 py-2">
                  <span className="block font-semibold">
                    {persona.firstName} {persona.lastName}
                  </span>
                  <span className="block text-[13px] text-muted">{persona.roleLabel}</span>
                </DropdownMenu.Label>
                <DropdownMenu.Separator className="my-1 h-px bg-line" />
                <DropdownMenu.Item className={menuItem} onSelect={(e) => (e.preventDefault(), toggle())}>
                  <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
                  {theme === 'dark' ? 'Light theme' : 'Dark theme'}
                </DropdownMenu.Item>
                <DropdownMenu.Item className={menuItem} onSelect={() => navigate('/')}>
                  <Icon name="swap" />
                  All roles
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className={menuItem}
                  onSelect={() => {
                    void signOut().then(() => navigate('/'))
                  }}
                >
                  <Icon name="logout" />
                  Sign out
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                aria-label="Menu"
                className="inline-flex size-11 flex-none cursor-pointer items-center justify-center rounded-ctl border border-line bg-surface text-ink md:hidden"
              >
                <Icon name="menu" size={18} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content align="end" sideOffset={8} className={menuPanel}>
                {nav.map((n) => (
                  <DropdownMenu.Item key={n.to} className={menuItem} onSelect={() => navigate(n.to)}>
                    {n.label}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
    </header>
  )
}
