import { fetchEventSource } from '@microsoft/fetch-event-source'
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useViewer } from '@/auth/AuthProvider'
import type { AssessmentKey, Criterion, ReviewerRole } from '@/domain/types'
import { apiUrl, authHeaders } from './client'
import { repository as repo, type DraftState } from './repository'

export const qk = {
  all: ['assay'] as const,
  myTeams: (u: string) => ['assay', 'my-teams', u] as const,
  grading: (u: string, t: string, a: string) => ['assay', 'grading', u, t, a] as const,
  overview: ['assay', 'overview'] as const,
  team: (t: string) => ['assay', 'team', t] as const,
  rubrics: (u: string) => ['assay', 'rubrics', u] as const,
  schedule: (u: string) => ['assay', 'schedule', u] as const,
  notifications: (u: string) => ['assay', 'notifications', u] as const,
  student: (u: string) => ['assay', 'student', u] as const,
  teams: ['assay', 'teams'] as const,
}

/** Any write can change grades, the feed and notifications everywhere: refresh it all. */
function invalidateAll(qc: QueryClient) {
  return qc.invalidateQueries({ queryKey: qk.all })
}

/**
 * Live updates over the notification stream (SSE, contract `/api/notifications/stream`). A fetch-based
 * client sends the two headers EventSource can't. New notifications, activity and unread counts
 * refetch what they affect; after a drop it reconnects and refetches to catch up.
 */
export function useLiveUpdates() {
  const qc = useQueryClient()
  const { viewer } = useViewer()
  useEffect(() => {
    const ctrl = new AbortController()
    let opened = false
    void (async () => {
      try {
        await fetchEventSource(apiUrl('/api/notifications/stream'), {
          signal: ctrl.signal,
          headers: await authHeaders(),
          openWhenHidden: true,
          async onopen(res) {
            if (!res.ok) throw new Error(`stream ${res.status}`)
            if (opened) void invalidateAll(qc)
            opened = true
          },
          onmessage(ev) {
            if (ev.event === 'notification' || ev.event === 'unread-count') void qc.invalidateQueries({ queryKey: qk.notifications(viewer.userId) })
            if (ev.event === 'notification' || ev.event === 'activity') void invalidateAll(qc)
          },
          onerror() {
            // Retry with the library's back-off; queries still poll as a fallback.
            return 5_000
          },
        })
      } catch {
        /* stream unavailable: polling keeps the screens fresh */
      }
    })()
    return () => ctrl.abort()
  }, [qc, viewer.userId])
}

export function useMyTeams() {
  const { viewer } = useViewer()
  return useQuery({ queryKey: qk.myTeams(viewer.userId), queryFn: () => repo.myTeams() })
}

export function useGrading(teamId: string, a: AssessmentKey) {
  const { viewer } = useViewer()
  return useQuery({ queryKey: qk.grading(viewer.userId, teamId, a), queryFn: () => repo.grading(teamId, a) })
}

export function useSaveDraft(teamId: string, a: AssessmentKey) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (d: DraftState) => repo.saveDraft(teamId, a, d),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useSubmit(teamId: string, a: AssessmentKey) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (d?: DraftState) => repo.submit(teamId, a, d), onSuccess: () => invalidateAll(qc) })
}

export function useOverview() {
  return useQuery({ queryKey: qk.overview, queryFn: () => repo.overview(), refetchInterval: 30_000 })
}

export function useRelease() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (a: AssessmentKey) => repo.release(a), onSuccess: () => invalidateAll(qc) })
}

export function useTeamDetail(teamId: string) {
  return useQuery({ queryKey: qk.team(teamId), queryFn: () => repo.teamDetail(teamId) })
}

export function useRubrics() {
  const { viewer } = useViewer()
  return useQuery({ queryKey: qk.rubrics(viewer.userId), queryFn: () => repo.rubrics(viewer) })
}

export function useSaveRubric(a: AssessmentKey) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (c: Criterion[]) => repo.saveRubric(a, c), onSuccess: () => invalidateAll(qc) })
}

export function useSchedule() {
  const { viewer } = useViewer()
  return useQuery({ queryKey: qk.schedule(viewer.userId), queryFn: () => repo.schedule(viewer) })
}

export function useSetDue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ a, date }: { a: AssessmentKey; date: string }) => repo.setDue(a, date),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useMoveDefense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ teamId, start, room }: { teamId: string; start: string; room?: string }) => repo.moveDefense(teamId, start, room),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useNotifications() {
  const { viewer } = useViewer()
  return useQuery({ queryKey: qk.notifications(viewer.userId), queryFn: () => repo.notifications(viewer), refetchInterval: 60_000 })
}

export function useMarkRead() {
  const { viewer } = useViewer()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string | 'all') => repo.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.notifications(viewer.userId) }),
  })
}

export function useStudentHome() {
  const { viewer } = useViewer()
  return useQuery({ queryKey: qk.student(viewer.userId), queryFn: () => repo.studentHome() })
}

export function useTeams() {
  return useQuery({ queryKey: qk.teams, queryFn: () => repo.teams() })
}

type TeamOp =
  | { op: 'create'; name: string; projectTitle: string }
  | { op: 'update'; teamId: string; patch: { name?: string; projectTitle?: string; description?: string } }
  | { op: 'delete'; teamId: string }
  | { op: 'addStudent'; teamId: string; first: string; last: string; email: string }
  | { op: 'removeStudent'; teamId: string; studentId: string }
  | { op: 'assign'; teamId: string; reviewerId: string; role: ReviewerRole }
  | { op: 'unassign'; teamId: string; reviewerId: string }

export function useTeamOps() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (o: TeamOp): Promise<string | void> => {
      switch (o.op) {
        case 'create':
          return repo.createTeam(o.name, o.projectTitle)
        case 'update':
          return repo.updateTeam(o.teamId, o.patch)
        case 'delete':
          return repo.deleteTeam(o.teamId)
        case 'addStudent':
          return repo.addStudent(o.teamId, o.first, o.last, o.email)
        case 'removeStudent':
          return repo.removeStudent(o.teamId, o.studentId)
        case 'assign':
          return repo.assignReviewer(o.teamId, o.reviewerId, o.role)
        case 'unassign':
          return repo.unassignReviewer(o.teamId, o.reviewerId)
      }
    },
    onSuccess: () => invalidateAll(qc),
  })
}

export function useResetDemo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => repo.resetDemo(),
    onSuccess: () => {
      qc.clear()
    },
  })
}
