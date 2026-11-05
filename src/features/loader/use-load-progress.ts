'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { LoadStep } from '@/lib/api/load-network'
import { FetchError } from '@/lib/fetch-json'

interface LoadProgress {
  progress: number
  label: string
  error: FetchError | null
  done: boolean
  retry: () => void
}

const toFetchError = (cause: unknown): FetchError =>
  cause instanceof FetchError
    ? cause
    : new FetchError(cause instanceof Error ? cause.message : String(cause), { url: '', status: null, body: null })

export function useLoadProgress(steps: readonly LoadStep[]): LoadProgress {
  const stepsRef = useRef(steps)
  stepsRef.current = steps
  const cancelRef = useRef<() => void>(() => {})
  const [finished, setFinished] = useState<ReadonlySet<number>>(() => new Set())
  const [error, setError] = useState<FetchError | null>(null)

  const start = useCallback(() => {
    cancelRef.current()
    let cancelled = false
    cancelRef.current = () => {
      cancelled = true
    }
    setFinished(new Set())
    setError(null)
    let failed = false
    const runStep = async (step: LoadStep, index: number) => {
      try {
        await step.run()
      } catch (cause) {
        if (!cancelled && !failed) setError(toFetchError(cause))
        failed = true
        throw cause
      }
      if (!cancelled && !failed) setFinished((done) => new Set(done).add(index))
    }
    const run = async () => {
      let pending: Promise<void>[] = []
      for (const [index, step] of stepsRef.current.entries()) {
        if (step.barrier) {
          await Promise.all(pending)
          if (cancelled) return
          pending = []
        }
        pending.push(runStep(step, index))
      }
      await Promise.all(pending)
    }
    run().catch(() => undefined)
  }, [])

  useEffect(() => {
    start()
    return () => cancelRef.current()
  }, [start])

  const total = steps.length
  const completed = finished.size
  const nextPending = steps.findIndex((_, i) => !finished.has(i))
  return {
    progress: total === 0 ? 0 : completed / total,
    label: steps[nextPending === -1 ? total - 1 : nextPending]?.label ?? '',
    error,
    done: total > 0 && completed === total && error === null,
    retry: start,
  }
}
