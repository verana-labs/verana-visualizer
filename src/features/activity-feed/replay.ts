import { useCallback, useEffect, useRef, useState } from 'react'
import { replayWindows } from '@/domain/events'
import type { IndexerEvent } from '@/lib/api/schemas'
import { logger } from '@/lib/logger'

export const REPLAY_LIMIT = 100
export const REPLAY_COUNT = 30
export const REPLAY_INTERVAL_MS = 450

export type FetchEvents = (afterHeight: number, limit: number) => Promise<IndexerEvent[]>

export type ReplayState =
  | { status: 'idle' }
  | { status: 'searching' }
  | { status: 'running'; from: number; to: number }
  | { status: 'empty' }
  | { status: 'failed'; message: string }

export async function findReplayEvents(
  head: number,
  fetchEvents: FetchEvents
): Promise<{ after: number; events: IndexerEvent[] } | null> {
  for (const after of replayWindows(head)) {
    const events = await fetchEvents(after, REPLAY_LIMIT)
    if (events.length > 0) return { after, events: events.slice(-REPLAY_COUNT) }
  }
  return null
}

export function useReplay(fetchEvents: FetchEvents, onEvent: (ev: IndexerEvent) => void, head: () => number | null) {
  const [state, setState] = useState<ReplayState>({ status: 'idle' })
  const run = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const cancel = useCallback(() => {
    run.current += 1
    clearTimeout(timer.current)
    setState({ status: 'idle' })
  }, [])

  useEffect(
    () => () => {
      run.current += 1
      clearTimeout(timer.current)
    },
    []
  )

  const start = useCallback(async () => {
    const height = head()
    if (height === null) throw new Error('Cannot replay before the block height is known')
    const id = ++run.current
    setState({ status: 'searching' })
    let found: Awaited<ReturnType<typeof findReplayEvents>>
    try {
      found = await findReplayEvents(height, fetchEvents)
    } catch (error) {
      logger.error('Replay could not fetch past events', error)
      if (id === run.current)
        setState({ status: 'failed', message: error instanceof Error ? error.message : String(error) })
      return
    }
    if (id !== run.current) return
    if (!found) {
      setState({ status: 'empty' })
      return
    }
    const { events } = found
    setState({ status: 'running', from: events[0].block_height, to: events[events.length - 1].block_height })
    const play = (index: number) => {
      if (id !== run.current) return
      onEvent(events[index])
      if (index === events.length - 1) {
        setState({ status: 'idle' })
        return
      }
      timer.current = setTimeout(() => play(index + 1), REPLAY_INTERVAL_MS)
    }
    play(0)
  }, [fetchEvents, onEvent, head])

  return { state, start, cancel }
}
