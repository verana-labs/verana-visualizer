'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { FetchError } from '@/lib/fetch-json'

export interface LoadStepSpec {
  label: string
  run: () => Promise<unknown>
}

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

export function useLoadProgress(steps: readonly LoadStepSpec[]): LoadProgress {
  const stepsRef = useRef(steps)
  stepsRef.current = steps
  const cancelRef = useRef<() => void>(() => {})
  const [completed, setCompleted] = useState(0)
  const [error, setError] = useState<FetchError | null>(null)

  const start = useCallback(() => {
    cancelRef.current()
    let cancelled = false
    cancelRef.current = () => {
      cancelled = true
    }
    setCompleted(0)
    setError(null)
    const run = async () => {
      const current = stepsRef.current
      for (let i = 0; i < current.length; i++) {
        try {
          await current[i].run()
        } catch (cause) {
          if (!cancelled) setError(toFetchError(cause))
          return
        }
        if (cancelled) return
        setCompleted(i + 1)
      }
    }
    void run()
  }, [])

  useEffect(() => {
    start()
    return () => cancelRef.current()
  }, [start])

  const total = steps.length
  return {
    progress: total === 0 ? 0 : completed / total,
    label: steps[Math.min(completed, total - 1)]?.label ?? '',
    error,
    done: total > 0 && completed === total && error === null,
    retry: start,
  }
}
