import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { replayWindows } from '@/domain/events'
import type { IndexerEvent } from '@/lib/api/schemas'
import { findReplayEvents, useReplay } from './replay'

const event = (block: number): IndexerEvent => ({
  type: 'indexer-event',
  event_type: 'StartParticipantOP',
  did: null,
  block_height: block,
  tx_hash: null,
  timestamp: '2026-10-15T19:20:27Z',
  payload: { module: 'pp' },
})

const range = (from: number, n: number) => Array.from({ length: n }, (_, i) => event(from + i))

describe('findReplayEvents', () => {
  it('tries the windows newest first with limit 100 and stops at the first non-empty one', async () => {
    const head = 97_497
    const windows = replayWindows(head)
    const fetchEvents = vi.fn(async (after: number) => (after === windows[3] ? range(after + 1, 40) : []))
    const found = await findReplayEvents(head, fetchEvents)
    expect(fetchEvents.mock.calls).toEqual(windows.slice(0, 4).map((w) => [w, 100, expect.anything()]))
    expect(found?.events).toHaveLength(30)
    expect(found?.events[0].block_height).toBe(windows[3] + 11)
    expect(found?.events[29].block_height).toBe(windows[3] + 40)
  })

  it('pages forward from the last event while pages are full, then keeps the newest 30', async () => {
    const pages = new Map<number, IndexerEvent[]>([
      [27_497, range(27_509, 100)],
      [27_608, range(27_700, 100)],
      [27_799, range(44_190, 11)],
    ])
    const fetchEvents = vi.fn(async (after: number) => pages.get(after) ?? [])
    const found = await findReplayEvents(97_497, fetchEvents)
    expect(fetchEvents.mock.calls.slice(3).map(([after]) => after)).toEqual([27_497, 27_608, 27_799])
    expect(found?.events).toHaveLength(30)
    expect(found?.events[0].block_height).toBe(27_781)
    expect(found?.events[29].block_height).toBe(44_200)
  })

  it('stops paging once cancelled', async () => {
    const controller = new AbortController()
    const fetchEvents = vi.fn(async (after: number) => {
      if (after === 87_497) controller.abort()
      return range(after + 1, 100)
    })
    await expect(findReplayEvents(97_497, fetchEvents, controller.signal)).rejects.toThrow()
    expect(fetchEvents).toHaveBeenCalledTimes(1)
  })

  it('returns null when every window is empty', async () => {
    const fetchEvents = vi.fn(async () => [])
    expect(await findReplayEvents(50_000, fetchEvents)).toBeNull()
    expect(fetchEvents).toHaveBeenCalledTimes(replayWindows(50_000).length)
  })
})

describe('useReplay', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('replays the found events at 450 ms intervals, labelled by block range', async () => {
    const onEvent = vi.fn()
    const fetchEvents = vi.fn(async (after: number) => (after === 10_000 ? range(1000, 40) : []))
    const { result } = renderHook(() => useReplay(fetchEvents, onEvent, () => 20_000))
    await act(async () => {
      await result.current.start()
    })
    expect(result.current.state).toEqual({ status: 'running', from: 1010, to: 1039 })
    expect(onEvent).toHaveBeenCalledTimes(1)
    act(() => vi.advanceTimersByTime(449))
    expect(onEvent).toHaveBeenCalledTimes(1)
    act(() => vi.advanceTimersByTime(1))
    expect(onEvent).toHaveBeenCalledTimes(2)
    act(() => vi.advanceTimersByTime(450 * 28))
    expect(onEvent).toHaveBeenCalledTimes(30)
    expect(onEvent.mock.calls.map(([ev]) => ev.block_height)).toEqual(range(1010, 30).map((e) => e.block_height))
    expect(result.current.state).toEqual({ status: 'idle' })
  })

  it('can be cancelled mid-replay', async () => {
    const onEvent = vi.fn()
    const { result } = renderHook(() =>
      useReplay(
        async () => range(1, 30),
        onEvent,
        () => 20_000
      )
    )
    await act(async () => {
      await result.current.start()
    })
    act(() => vi.advanceTimersByTime(450 * 4))
    act(() => result.current.cancel())
    act(() => vi.advanceTimersByTime(450 * 40))
    expect(onEvent).toHaveBeenCalledTimes(5)
    expect(result.current.state).toEqual({ status: 'idle' })
  })

  it('reports "no events" instead of inventing any', async () => {
    const onEvent = vi.fn()
    const { result } = renderHook(() =>
      useReplay(
        async () => [],
        onEvent,
        () => 20_000
      )
    )
    await act(async () => {
      await result.current.start()
    })
    expect(result.current.state).toEqual({ status: 'empty' })
    expect(onEvent).not.toHaveBeenCalled()
  })

  it('stops searching when cancelled mid-search', async () => {
    let release: (events: IndexerEvent[]) => void = () => {}
    const fetchEvents = vi.fn(() => new Promise<IndexerEvent[]>((resolve) => (release = resolve)))
    const onEvent = vi.fn()
    const { result } = renderHook(() => useReplay(fetchEvents, onEvent, () => 97_497))
    let pending: Promise<void> = Promise.resolve()
    act(() => {
      pending = result.current.start()
    })
    act(() => result.current.cancel())
    await act(async () => {
      release([])
      await pending
    })
    expect(fetchEvents).toHaveBeenCalledTimes(1)
    expect(onEvent).not.toHaveBeenCalled()
    expect(result.current.state).toEqual({ status: 'idle' })
  })

  it('resolves to an error state before the block height is known', async () => {
    const fetchEvents = vi.fn()
    const { result } = renderHook(() => useReplay(fetchEvents, vi.fn(), () => null))
    await act(async () => {
      await expect(result.current.start()).resolves.toBeUndefined()
    })
    expect(result.current.state).toEqual({ status: 'failed', message: 'the block height is not known yet' })
    expect(fetchEvents).not.toHaveBeenCalled()
  })

  it('surfaces a failed fetch', async () => {
    const { result } = renderHook(() =>
      useReplay(
        async () => {
          throw new Error('HTTP 503')
        },
        vi.fn(),
        () => 20_000
      )
    )
    await act(async () => {
      await result.current.start()
    })
    expect(result.current.state).toEqual({ status: 'failed', message: 'HTTP 503' })
  })
})
