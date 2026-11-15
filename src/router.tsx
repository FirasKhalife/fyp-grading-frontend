import type { ReactNode } from 'react'
import { createBrowserRouter, Navigate, Outlet, useLocation, type RouteObject } from 'react-router'
import { useAuth } from '@/auth/AuthProvider'
import type { PersonaRole } from '@/domain/types'
import { AppShell } from '@/components/shell/AppShell'
import { AuthCallbackPage } from '@/features/landing/AuthCallbackPage'
import { LandingPage } from '@/features/landing/LandingPage'
import { GradingPage } from '@/features/grading/GradingPage'
import { MyTeamsPage } from '@/features/my-teams/MyTeamsPage'
import { OverviewPage } from '@/features/overview/OverviewPage'
import { RubricEditorPage } from '@/features/rubrics/RubricEditorPage'
import { RubricsPage } from '@/features/rubrics/RubricsPage'
import { SchedulePage } from '@/features/schedule/SchedulePage'
import { StudentHomePage } from '@/features/student/StudentHomePage'
import { TeamDetailPage } from '@/features/team-detail/TeamDetailPage'
import { TeamsPage } from '@/features/teams/TeamsPage'
import { CrashPage, NoPermissionPage, NotFoundPage, ResetInProgressPage, SessionExpiredPage } from '@/features/utility/UtilityPages'

function RequireAuth() {
  const { persona, ready } = useAuth()
  const location = useLocation()
  if (!ready) return null
  if (!persona) return <Navigate to="/" replace state={{ from: location.pathname }} />
  return <Outlet />
}

function RequireRole({ roles, audience, children }: { roles: PersonaRole[]; audience: 'admin' | 'reviewer' | 'student'; children: ReactNode }) {
  const { persona } = useAuth()
  if (!persona || !roles.includes(persona.role)) return <NoPermissionPage for={audience} />
  return <>{children}</>
}

function Home() {
  const { persona, ready } = useAuth()
  if (!ready) return null
  return persona ? <Navigate to={persona.home} replace /> : <LandingPage />
}

const reviewers: PersonaRole[] = ['JURY', 'ADVISOR', 'COORDINATOR']
const admin: PersonaRole[] = ['COORDINATOR']

export const routes: RouteObject[] = [
  { path: '/', element: <LandingPage />, errorElement: <CrashPage /> },
  { path: '/roles', element: <LandingPage /> },
  { path: '/home', element: <Home /> },
  { path: '/auth/callback', element: <AuthCallbackPage /> },
  {
    element: <RequireAuth />,
    errorElement: <CrashPage />,
    children: [
      {
        element: <AppShell />,
        errorElement: <CrashPage />,
        children: [
          { path: '/my-teams', element: <RequireRole roles={reviewers} audience="reviewer"><MyTeamsPage /></RequireRole> },
          { path: '/grade/:teamId/:assessment', element: <RequireRole roles={reviewers} audience="reviewer"><GradingPage /></RequireRole> },
          { path: '/overview', element: <RequireRole roles={admin} audience="admin"><OverviewPage /></RequireRole> },
          { path: '/teams', element: <RequireRole roles={admin} audience="admin"><TeamsPage /></RequireRole> },
          { path: '/teams/:teamId', element: <RequireRole roles={admin} audience="admin"><TeamDetailPage /></RequireRole> },
          { path: '/rubrics', element: <RubricsPage /> },
          { path: '/rubrics/:assessment', element: <RubricsPage /> },
          { path: '/rubrics/:assessment/edit', element: <RequireRole roles={admin} audience="admin"><RubricEditorPage /></RequireRole> },
          { path: '/schedule', element: <SchedulePage /> },
          { path: '/student', element: <RequireRole roles={['STUDENT']} audience="student"><StudentHomePage /></RequireRole> },
          { path: '/session-expired', element: <SessionExpiredPage /> },
          { path: '/resetting', element: <ResetInProgressPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]

export function createRouter() {
  return createBrowserRouter(routes)
}
