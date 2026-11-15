import { useCallback, useEffect, useRef, useState } from 'react'
import { useSaveDraft } from '@/api/queries'
import type { AssessmentKey, Evaluation, Level } from '@/domain/types'
import type { DraftPatch } from '@/mocks/logic'

export interface DraftState {
  levels: Record<string, Level | null>
  comments: Record<string, string>
  overall: string
}

function fromEvaluation(e: Evaluation | null, criterionIds: string[]): DraftState {
  return {
    levels: Object.fromEntries(criterionIds.map((id) => [id, e?.levels[id] ?? null])),
    comments: { ...(e?.comments ?? {}) },
    overall: e?.overallComment ?? '',
  }
}

/**
 * Local draft state with autosave: level picks save at once, typing saves after a short pause.
 * Pending changes are merged into one patch and flushed on unmount, so nothing typed is lost.
 */
export function useDraft(teamId: string, a: AssessmentKey, evaluation: Evaluation | null, criterionIds: string[]) {
  const [draft, setDraft] = useState<DraftState>(() => fromEvaluation(evaluation, criterionIds))
  const [savedAt, setSavedAt] = useState<string | null>(evaluation?.updatedAt ?? null)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const save = useSaveDraft(teamId, a)
  const pending = useRef<DraftPatch>({})
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveRef = useRef(save.mutateAsync)
  saveRef.current = save.mutateAsync

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    const patch = pending.current
    if (!patch.levels && !patch.comments && patch.overallComment === undefined) return
    pending.current = {}
    setSaving(true)
    try {
      const e = await saveRef.current(patch)
      setSavedAt(e.updatedAt)
      setFailed(false)
    } catch {
      // Put the changes back so the next save retries them.
      pending.current = {
        levels: { ...patch.levels, ...pending.current.levels },
        comments: { ...patch.comments, ...pending.current.comments },
        overallComment: pending.current.overallComment ?? patch.overallComment,
      }
      setFailed(true)
    } finally {
      setSaving(false)
    }
  }, [])

  const schedule = useCallback(
    (delay: number) => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => void flush(), delay)
    },
    [flush],
  )

  useEffect(() => () => void flush(), [flush])

  const setLevel = useCallback(
    (id: string, l: Level) => {
      setDraft((d) => ({ ...d, levels: { ...d.levels, [id]: l } }))
      pending.current = { ...pending.current, levels: { ...pending.current.levels, [id]: l } }
      schedule(0)
    },
    [schedule],
  )
  const setComment = useCallback(
    (id: string, text: string) => {
      setDraft((d) => ({ ...d, comments: { ...d.comments, [id]: text } }))
      pending.current = { ...pending.current, comments: { ...pending.current.comments, [id]: text } }
      schedule(700)
    },
    [schedule],
  )
  const setOverall = useCallback(
    (text: string) => {
      setDraft((d) => ({ ...d, overall: text }))
      pending.current = { ...pending.current, overallComment: text }
      schedule(700)
    },
    [schedule],
  )

  return { draft, setLevel, setComment, setOverall, flush, savedAt, saving, failed }
}
