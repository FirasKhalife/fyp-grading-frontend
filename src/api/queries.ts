import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useViewer } from '@/auth/AuthProvider'
import type { AssessmentKey, Criterion, ReviewerRole } from '@/domain/types'
import type { DraftPatch } from '@/mocks/logic'
import * as store from '@/mocks/store'
import { repository as repo } from './repository'

export const qk = {
  all: ['assay'] as const,
  myTeams: (u: string) => ['assay', 'my-teams', u] as const,
  grading: (u: string, t: string, a: string) => ['assay', 'grading', u, t, a] as const,
  overview: ['assay', 'overview'] as const,
  team: (t: string) => ['assay', 'team', t] as const,
  rubrics: ['assay', 'rubrics'] as const,
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
 * "Live" updates. In mock mode, writes from another tab of this browser arrive through the storage
 * event; the real backend pushes over the gateway. Either way the queries refetch.
 */
export function useLiveUpdates() {
  const qc = useQueryClient()
  useEffect(() => store.subscribe(() => void invalidateAll(qc)), [qc])
}

export function useMyTeams() {
  const { viewer } = useViewer()
  return useQuery({ queryKey: qk.myTeams(viewer.userId), queryFn: () => repo.myTeams(viewer) })
}

export function useGrading(teamId: string, a: AssessmentKey) {
  const { viewer } = useViewer()
  return useQuery({ queryKey: qk.grading(viewer.userId, teamId, a), queryFn: () => repo.grading(viewer, teamId, a) })
}

export function useSaveDraft(teamId: string, a: AssessmentKey) {
  const { viewer } = useViewer()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: DraftPatch) => repo.saveDraft(viewer, teamId, a, patch),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useSubmit(teamId: string, a: AssessmentKey) {
  const { viewer } = useViewer()
  const qc = useQueryClient()
  return useMutation({ mutationFn: () => repo.submit(viewer, teamId, a), onSuccess: () => invalidateAll(qc) })
}

export function useOverview() {
  const { viewer } = useViewer()
  return useQuery({ queryKey: qk.overview, queryFn: () => repo.overview(viewer), refetchInterval: 20_000 })
}

export function useRelease() {
  const { viewer } = useViewer()
  const qc = useQueryClient()
  return useMutation({ mutationFn: (a: AssessmentKey) => repo.release(viewer, a), onSuccess: () => invalidateAll(qc) })
}

export function useTeamDetail(teamId: string) {
  const { viewer } = useViewer()
  return useQuery({ queryKey: qk.team(teamId), queryFn: () => repo.teamDetail(viewer, teamId) })
}

export function useRubrics() {
  const { viewer } = useViewer()
  return useQuery({ queryKey: qk.rubrics, queryFn: () => repo.rubrics(viewer) })
}

export function useSaveRubric(a: AssessmentKey) {
  const { viewer } = useViewer()
  const qc = useQueryClient()
  return useMutation({ mutationFn: (c: Criterion[]) => repo.saveRubric(viewer, a, c), onSuccess: () => invalidateAll(qc) })
}

export function useSchedule() {
  const { viewer } = useViewer()
  return useQuery({ queryKey: qk.schedule(viewer.userId), queryFn: () => repo.schedule(viewer) })
}

export function useSetDue() {
  const { viewer } = useViewer()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ a, date }: { a: AssessmentKey; date: string }) => repo.setDue(viewer, a, date),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useMoveDefense() {
  const { viewer } = useViewer()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ teamId, start, room }: { teamId: string; start: string; room?: string }) => repo.moveDefense(viewer, teamId, start, room),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useNotifications() {
  const { viewer } = useViewer()
  return useQuery({ queryKey: qk.notifications(viewer.userId), queryFn: () => repo.notifications(viewer), refetchInterval: 15_000 })
}

export function useMarkRead() {
  const { viewer } = useViewer()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string | 'all') => repo.markRead(viewer, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.notifications(viewer.userId) }),
  })
}

export function useStudentHome() {
  const { viewer } = useViewer()
  return useQuery({ queryKey: qk.student(viewer.userId), queryFn: () => repo.studentHome(viewer) })
}

export function useTeams() {
  const { viewer } = useViewer()
  return useQuery({ queryKey: qk.teams, queryFn: () => repo.teams(viewer) })
}

type TeamOp =
  | { op: 'create'; name: string; projectTitle: string }
  | { op: 'update'; teamId: string; patch: { name?: string; projectTitle?: string; description?: string } }
  | { op: 'delete'; teamId: string }
  | { op: 'addStudent'; teamId: string; first: string; last: string; email: string }
  | { op: 'removeStudent'; studentId: string }
  | { op: 'assign'; teamId: string; reviewerId: string; role: ReviewerRole }
  | { op: 'unassign'; teamId: string; reviewerId: string }

export function useTeamOps() {
  const { viewer } = useViewer()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (o: TeamOp): Promise<string | void> => {
      switch (o.op) {
        case 'create':
          return repo.createTeam(viewer, o.name, o.projectTitle)
        case 'update':
          return repo.updateTeam(viewer, o.teamId, o.patch)
        case 'delete':
          return repo.deleteTeam(viewer, o.teamId)
        case 'addStudent':
          return repo.addStudent(viewer, o.teamId, o.first, o.last, o.email)
        case 'removeStudent':
          return repo.removeStudent(viewer, o.studentId)
        case 'assign':
          return repo.assignReviewer(viewer, o.teamId, o.reviewerId, o.role)
        case 'unassign':
          return repo.unassignReviewer(viewer, o.teamId, o.reviewerId)
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
