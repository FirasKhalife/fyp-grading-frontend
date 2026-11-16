import { useCallback, useEffect, useRef, useState } from 'react'
import { useSaveDraft } from '@/api/queries'
import type { DraftState } from '@/api/repository'
import type { AssessmentKey, Evaluation, Level } from '@/domain/types'

export type { DraftState }

function fromEvaluation(e: Evaluation | null, criterionIds: string[]): DraftState {
  return {
    levels: Object.fromEntries(criterionIds.map((id) => [id, e?.levels[id] ?? null])),
    comments: { ...(e?.comments ?? {}) },
    overall: e?.overallComment ?? '',
  }
}

/**
 * Local form state with autosave. The contract's draft save takes the full form, so each save sends
 * everything: level picks save at once, typing saves after a short pause, and a pending save is
 * flushed on unmount so nothing typed is lost.
 */
export function useDraft(teamId: string, a: AssessmentKey, evaluation: Evaluation | null, criterionIds: string[]) {
  const [draft, setDraft] = useState<DraftState>(() => fromEvaluation(evaluation, criterionIds))
  const [savedAt, setSavedAt] = useState<string | null>(evaluation?.updatedAt ?? null)
  const [saving, setSaving] = useState(false)
  const [failed, setFailedState] = useState(false)
  const failedRef = useRef(false)
  const save = useSaveDraft(teamId, a)
  const latest = useRef(draft)
  const dirty = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveRef = useRef(save.mutateAsync)
  useEffect(() => {
    saveRef.current = save.mutateAsync
  })

  const inFlight = useRef<Promise<void> | null>(null)

  /**
   * Saves are serialised: while one is in flight, later changes only mark the form dirty, and the
   * latest full state is sent once it settles. Two quick picks can't land out of order.
   */
  const flush = useCallback(async (): Promise<void> => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    // Wait for a save in flight; it will hand over to this loop when it settles.
    while (inFlight.current) await inFlight.current
    while (dirty.current) {
      dirty.current = false
      setSaving(true)
      let ok = true
      const run = saveRef.current(latest.current).then(
        (e) => {
          setSavedAt(e.updatedAt)
          failedRef.current = false
          setFailedState(false)
        },
        () => {
          ok = false
          dirty.current = true
          failedRef.current = true
          setFailedState(true)
        },
      )
      inFlight.current = run
      await run
      inFlight.current = null
      // A failed save waits for the next change rather than retrying in a tight loop.
      if (!ok) break
    }
    setSaving(false)
  }, [])

  const update = useCallback(
    (fn: (d: DraftState) => DraftState, delay: number) => {
      latest.current = fn(latest.current)
      dirty.current = true
      setDraft(latest.current)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => void flush(), delay)
    },
    [flush],
  )

  useEffect(() => () => void flush(), [flush])

  const setLevel = useCallback((id: string, l: Level) => update((d) => ({ ...d, levels: { ...d.levels, [id]: l } }), 0), [update])
  const setComment = useCallback((id: string, text: string) => update((d) => ({ ...d, comments: { ...d.comments, [id]: text } }), 700), [update])
  const setOverall = useCallback((text: string) => update((d) => ({ ...d, overall: text }), 700), [update])

  /** Cancel a pending autosave and hand back the full state (submit sends it in the same call). */
  const takeForSubmit = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    // Let a save in flight finish first, so it can't overwrite the submitted state afterwards.
    if (inFlight.current) await inFlight.current
    dirty.current = false
    return latest.current
  }, [])

  return { draft, setLevel, setComment, setOverall, flush, takeForSubmit, savedAt, saving, failed }
}
