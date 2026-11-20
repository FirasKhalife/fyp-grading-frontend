import { fetchEventSource } from '@microsoft/fetch-event-source'
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useViewer } from '@/auth/AuthProvider'
import type { AssessmentKey, Criterion, ReviewerRole } from '@/domain/types'
import { apiUrl, authHeaders, notifyUnauthorized } from './client'
import { ApiError, repository as repo, type DraftState } from './repository'
import type { GradingView } from './views'

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
 * The live stream's fetch: fresh auth headers on every (re)connect. Given to fetchEventSource, which
 * would otherwise reuse the first token forever, and would keep a token that has since been refreshed.
 */
export const streamFetch: typeof fetch = async (input, init) =>
  fetch(input, { ...init, headers: { ...(init?.headers as Record<string, string>), ...(await authHeaders()) } })

/** Stops the stream's retries (the library rethrows errors thrown from onerror). */
class StreamStopped extends Error {}

/**
 * Live updates over the notification stream (SSE, contract `/api/notifications/stream`). A fetch-based
 * client sends the two headers EventSource can't, rebuilt on every (re)connect so a refreshed token is
 * used. A 401 or 403 stops the retries and signs the user out; other drops retry with back-off, and
 * each reconnect refetches to catch up. Events refresh only what they can change.
 */
export function useLiveUpdates() {
  const qc = useQueryClient()
  const { viewer } = useViewer()
  useEffect(() => {
    const ctrl = new AbortController()
    let opened = false
    void fetchEventSource(apiUrl('/api/notifications/stream'), {
      signal: ctrl.signal,
      openWhenHidden: true,
      fetch: streamFetch,
      async onopen(res) {
        if (res.status === 401 || res.status === 403) {
          if (res.status === 401) notifyUnauthorized()
          throw new StreamStopped()
        }
        if (!res.ok) throw new Error(`stream ${res.status}`)
        if (opened) void invalidateAll(qc)
        opened = true
      },
      onmessage(ev) {
        if (ev.event === 'notification' || ev.event === 'unread-count') void qc.invalidateQueries({ queryKey: qk.notifications(viewer.userId) })
        if (ev.event === 'notification') {
          // A grade became final, results were released, a slot moved: the lists that show those.
          for (const key of [qk.myTeams(viewer.userId), qk.student(viewer.userId), qk.overview, qk.schedule(viewer.userId)])
            void qc.invalidateQueries({ queryKey: key })
          void qc.invalidateQueries({ queryKey: ['assay', 'team'] })
        }
        if (ev.event === 'activity') {
          void qc.invalidateQueries({ queryKey: qk.overview })
          void qc.invalidateQueries({ queryKey: ['assay', 'team'] })
        }
      },
      onerror(err) {
        if (err instanceof StreamStopped) throw err
        return 5_000
      },
    }).catch(() => {
      /* stopped: polling keeps the screens fresh */
    })
    return () => ctrl.abort()
  }, [qc, viewer.userId])
}

export function useMyTeams() {
  const { viewer } = useViewer()
  return useQuery({ queryKey: qk.myTeams(viewer.userId), queryFn: () => repo.myTeams() })
}

export function useGrading(teamId: string, a: AssessmentKey, enabled = true) {
  const { viewer } = useViewer()
  return useQuery({ queryKey: qk.grading(viewer.userId, teamId, a), queryFn: () => repo.grading(teamId, a), enabled })
}

/**
 * Autosave. Each save returns the evaluation, so the grading view is updated in place; only My teams
 * (draft counts) is refetched. Submit and release still refresh everything.
 */
/** Conflicts that mean the page shows stale state: refetch so the screen matches the server. */
const STALE_CODES = new Set(['assessment-final', 'rubric-changed', 'evaluation-submitted'])

export function useSaveDraft(teamId: string, a: AssessmentKey) {
  const qc = useQueryClient()
  const { viewer } = useViewer()
  return useMutation({
    mutationFn: (d: DraftState) => repo.saveDraft(teamId, a, d),
    onSuccess: (evaluation) => {
      qc.setQueryData<GradingView>(qk.grading(viewer.userId, teamId, a), (v) =>
        v ? { ...v, evaluation, peers: v.peers.map((p) => (p.you && p.state === 'NOT_STARTED' ? { ...p, state: 'DRAFT' as const } : p)) } : v,
      )
      void qc.invalidateQueries({ queryKey: qk.myTeams(viewer.userId) })
    },
    onError: (e) => {
      // Locked, being submitted elsewhere, or the rubric changed: reload the form from the server.
      if (e instanceof ApiError && (STALE_CODES.has(e.code) || e.code === 'evaluation-submitting')) {
        void qc.invalidateQueries({ queryKey: qk.grading(viewer.userId, teamId, a) })
      }
    },
  })
}

export function useSubmit(teamId: string, a: AssessmentKey) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (d?: DraftState) => {
      try {
        return await repo.submit(teamId, a, d)
      } catch (e) {
        // 409 `evaluation-changed`: the draft moved under the submit. The body carries the full form, so one retry is safe.
        if (e instanceof ApiError && e.code === 'evaluation-changed') return repo.submit(teamId, a, d)
        throw e
      }
    },
    onSuccess: () => invalidateAll(qc),
    onError: (e) => {
      if (e instanceof ApiError && STALE_CODES.has(e.code)) void invalidateAll(qc)
    },
  })
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

/** One team's history. Its key sits under the team's, so anything that refreshes the team refreshes it. */
export function useTeamHistory(teamId: string) {
  return useQuery({ queryKey: [...qk.team(teamId), 'history'], queryFn: () => repo.teamHistory(teamId) })
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
    mutationFn: ({ teamId, start, room }: { teamId: string; start: string; room: string }) => repo.moveDefense(teamId, start, room),
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
