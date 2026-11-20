import { lazy, type ReactNode } from 'react'
import { createBrowserRouter, Navigate, Outlet, useLocation, type RouteObject } from 'react-router'
import { useAuth } from '@/auth/AuthProvider'
import type { PersonaRole } from '@/domain/types'
import { AppShell } from '@/components/shell/AppShell'
import { AuthCallbackPage } from '@/features/landing/AuthCallbackPage'
import { LandingPage } from '@/features/landing/LandingPage'
import { CrashPage, NoPermissionPage, NotFoundPage, ResetInProgressPage, SessionExpiredPage } from '@/features/utility/UtilityPages'

/** Screens load on first visit, so the landing page stays light. */
const GradingPage = lazy(() => import('@/features/grading/GradingPage').then((m) => ({ default: m.GradingPage })))
const MyTeamsPage = lazy(() => import('@/features/my-teams/MyTeamsPage').then((m) => ({ default: m.MyTeamsPage })))
const OverviewPage = lazy(() => import('@/features/overview/OverviewPage').then((m) => ({ default: m.OverviewPage })))
const RubricEditorPage = lazy(() => import('@/features/rubrics/RubricEditorPage').then((m) => ({ default: m.RubricEditorPage })))
const RubricsPage = lazy(() => import('@/features/rubrics/RubricsPage').then((m) => ({ default: m.RubricsPage })))
const SchedulePage = lazy(() => import('@/features/schedule/SchedulePage').then((m) => ({ default: m.SchedulePage })))
const StudentHomePage = lazy(() => import('@/features/student/StudentHomePage').then((m) => ({ default: m.StudentHomePage })))
const TeamDetailPage = lazy(() => import('@/features/team-detail/TeamDetailPage').then((m) => ({ default: m.TeamDetailPage })))
const TeamsPage = lazy(() => import('@/features/teams/TeamsPage').then((m) => ({ default: m.TeamsPage })))

function RequireAuth() {
  const { persona, ready, expired } = useAuth()
  const location = useLocation()
  if (!ready) return null
  if (!persona) return <Navigate to={expired ? '/session-expired' : '/'} replace state={{ from: location.pathname }} />
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

const reviewers: PersonaRole[] = ['JURY', 'ADVISOR', 'REVIEWER', 'COORDINATOR']
const admin: PersonaRole[] = ['COORDINATOR']

export const routes: RouteObject[] = [
  { path: '/', element: <LandingPage />, errorElement: <CrashPage /> },
  { path: '/roles', element: <LandingPage /> },
  { path: '/home', element: <Home /> },
  { path: '/auth/callback', element: <AuthCallbackPage /> },
  { path: '/session-expired', element: <SessionExpiredPage /> },
  {
    element: <RequireAuth />,
    errorElement: <CrashPage />,
    children: [
      {
        element: <AppShell />,
        errorElement: <CrashPage />,
        children: [
          {
            path: '/my-teams',
            element: (
              <RequireRole roles={reviewers} audience="reviewer">
                <MyTeamsPage />
              </RequireRole>
            ),
          },
          {
            path: '/grade/:teamId/:assessment',
            element: (
              <RequireRole roles={reviewers} audience="reviewer">
                <GradingPage />
              </RequireRole>
            ),
          },
          {
            path: '/overview',
            element: (
              <RequireRole roles={admin} audience="admin">
                <OverviewPage />
              </RequireRole>
            ),
          },
          {
            path: '/teams',
            element: (
              <RequireRole roles={admin} audience="admin">
                <TeamsPage />
              </RequireRole>
            ),
          },
          {
            path: '/teams/:teamId',
            element: (
              <RequireRole roles={admin} audience="admin">
                <TeamDetailPage />
              </RequireRole>
            ),
          },
          { path: '/rubrics', element: <RubricsPage /> },
          { path: '/rubrics/:assessment', element: <RubricsPage /> },
          {
            path: '/rubrics/:assessment/edit',
            element: (
              <RequireRole roles={admin} audience="admin">
                <RubricEditorPage />
              </RequireRole>
            ),
          },
          { path: '/schedule', element: <SchedulePage /> },
          {
            path: '/student',
            element: (
              <RequireRole roles={['STUDENT']} audience="student">
                <StudentHomePage />
              </RequireRole>
            ),
          },
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
