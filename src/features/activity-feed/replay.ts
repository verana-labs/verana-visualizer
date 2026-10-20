import { useCallback, useEffect, useRef, useState } from 'react'
import { replayWindows } from '@/domain/events'
import type { IndexerEvent } from '@/lib/api/schemas'
import { logger } from '@/lib/logger'

export const REPLAY_LIMIT = 100
export const REPLAY_COUNT = 30
export const REPLAY_INTERVAL_MS = 450

export type FetchEvents = (afterHeight: number, limit: number, signal: AbortSignal) => Promise<IndexerEvent[]>

export type ReplayState =
  | { status: 'idle' }
  | { status: 'searching' }
  | { status: 'running'; from: number; to: number }
  | { status: 'empty' }
  | { status: 'failed'; message: string }

async function newestFrom(
  firstPage: IndexerEvent[],
  fetchEvents: FetchEvents,
  signal: AbortSignal
): Promise<IndexerEvent[]> {
  let page = firstPage
  let tail = firstPage.slice(-REPLAY_COUNT)
  while (page.length === REPLAY_LIMIT) {
    signal.throwIfAborted()
    const after = page[page.length - 1].block_height
    page = await fetchEvents(after, REPLAY_LIMIT, signal)
    if (page.length > 0 && page[page.length - 1].block_height <= after) break
    tail = [...tail, ...page].slice(-REPLAY_COUNT)
  }
  return tail
}

export async function findReplayEvents(
  head: number,
  fetchEvents: FetchEvents,
  signal: AbortSignal = new AbortController().signal
): Promise<{ after: number; events: IndexerEvent[] } | null> {
  for (const after of replayWindows(head)) {
    signal.throwIfAborted()
    const page = await fetchEvents(after, REPLAY_LIMIT, signal)
    if (page.length > 0) return { after, events: await newestFrom(page, fetchEvents, signal) }
  }
  return null
}

export function useReplay(fetchEvents: FetchEvents, onEvent: (ev: IndexerEvent) => void, head: () => number | null) {
  const [state, setState] = useState<ReplayState>({ status: 'idle' })
  const controller = useRef<AbortController | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const stop = useCallback(() => {
    controller.current?.abort()
    controller.current = null
    clearTimeout(timer.current)
  }, [])

  const cancel = useCallback(() => {
    stop()
    setState({ status: 'idle' })
  }, [stop])

  useEffect(() => stop, [stop])

  const start = useCallback(async () => {
    const height = head()
    if (height === null) {
      setState({ status: 'failed', message: 'the block height is not known yet' })
      return
    }
    stop()
    const run = new AbortController()
    controller.current = run
    setState({ status: 'searching' })
    let found: Awaited<ReturnType<typeof findReplayEvents>>
    try {
      found = await findReplayEvents(height, fetchEvents, run.signal)
    } catch (error) {
      if (run.signal.aborted) return
      logger.error('Replay could not fetch past events', error)
      setState({ status: 'failed', message: error instanceof Error ? error.message : String(error) })
      return
    }
    if (run.signal.aborted) return
    if (!found) {
      setState({ status: 'empty' })
      return
    }
    const { events } = found
    setState({ status: 'running', from: events[0].block_height, to: events[events.length - 1].block_height })
    const play = (index: number) => {
      if (run.signal.aborted) return
      onEvent(events[index])
      if (index === events.length - 1) {
        setState({ status: 'idle' })
        return
      }
      timer.current = setTimeout(() => play(index + 1), REPLAY_INTERVAL_MS)
    }
    play(0)
  }, [fetchEvents, onEvent, head, stop])

  return { state, start, cancel }
}
