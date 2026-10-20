import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { testnetModel } from '@/features/search/search-fixture'
import { useTour } from '@/features/tour/tour-store'
import { testnetCfg } from '@/features/trust-check/trust-fixture'
import type { IndexerEvent } from '@/lib/api/schemas'
import { useObservatory } from '@/store/observatory-store'
import { Autopilot, LIVE_STEP_MS, STEP_MS } from './autopilot'

const events = vi.hoisted(() => vi.fn<(after: number, limit: number) => Promise<{ data: IndexerEvent[] }>>())
vi.mock('@/lib/api/indexer', () => ({ createIndexerClient: () => ({ events }) }))

const reduced = vi.hoisted(() => ({ value: false }))
vi.mock('@/scene/use-reduced-motion', () => ({ usePrefersReducedMotion: () => reduced.value }))

const recorded = (
  JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/testnet/events.json'), 'utf8')) as IndexerEvent[]
).slice(0, 2)

beforeEach(() => {
  vi.useFakeTimers()
  reduced.value = false
  events.mockReset().mockResolvedValue({ data: recorded })
  useObservatory.setState({ model: testnetModel(), blockHeight: 8000, feed: [] })
  useTour.setState({ step: null, presenting: false, note: null })
})

afterEach(() => {
  vi.useRealTimers()
})

const present = () => act(() => useTour.getState().present())

describe('Autopilot', () => {
  it('loops through the tour steps with captions', async () => {
    render(<Autopilot cfg={testnetCfg} />)
    present()
    expect(useTour.getState()).toMatchObject({ step: 0, presenting: true })
    await act(async () => vi.advanceTimersByTime(STEP_MS))
    expect(useTour.getState().step).toBe(1)
    for (let i = 1; i < 9; i++) await act(async () => vi.advanceTimersByTime(STEP_MS))
    expect(useTour.getState().step).toBe(9)
    await act(async () => vi.advanceTimersByTime(LIVE_STEP_MS))
    expect(useTour.getState()).toMatchObject({ step: 0, presenting: true })
  })

  it('replays recorded real events during the live core step and never invents any', async () => {
    render(<Autopilot cfg={testnetCfg} />)
    present()
    expect(events).not.toHaveBeenCalled()
    act(() => useTour.getState().go(9))
    await act(() => vi.advanceTimersByTimeAsync(10))
    expect(events).toHaveBeenCalled()
    expect(useTour.getState().note).toBe('Replaying recorded transactions from blocks 7,051–7,055')
    await act(() => vi.advanceTimersByTimeAsync(2000))
    const feed = useObservatory.getState().feed
    expect(feed.map((f) => f.block).sort()).toEqual(recorded.map((ev) => ev.block_height).sort())
  })

  it.each([
    ['a key', () => fireEvent.keyDown(window, { key: 'a' })],
    ['a click', () => fireEvent.pointerDown(document.body)],
    ['the wheel', () => fireEvent.wheel(window)],
    ['a touch', () => fireEvent.touchStart(window)],
  ])('stops immediately on %s', (_, input) => {
    render(<Autopilot cfg={testnetCfg} />)
    present()
    act(input)
    expect(useTour.getState()).toMatchObject({ step: null, presenting: false })
    act(() => vi.advanceTimersByTime(STEP_MS * 3))
    expect(useTour.getState().step).toBeNull()
  })

  it('cross-fades instead of flying when motion is reduced', async () => {
    reduced.value = true
    const { getByTestId } = render(<Autopilot cfg={testnetCfg} />)
    present()
    await act(async () => vi.advanceTimersByTime(STEP_MS))
    expect(getByTestId('autopilot-fade')).toHaveStyle({ opacity: '1' })
    expect(useTour.getState().step).toBe(0)
    await act(async () => vi.advanceTimersByTime(400))
    expect(useTour.getState().step).toBe(1)
    expect(getByTestId('autopilot-fade')).toHaveStyle({ opacity: '1' })
    await act(async () => vi.advanceTimersByTime(1000))
    expect(getByTestId('autopilot-fade')).toHaveStyle({ opacity: '0' })
  })

  it('does not resume when stopped in the middle of a cross-fade', async () => {
    reduced.value = true
    const { getByTestId } = render(<Autopilot cfg={testnetCfg} />)
    present()
    await act(async () => vi.advanceTimersByTime(STEP_MS + 100))
    act(() => fireEvent.keyDown(window, { key: 'Escape' }))
    await act(async () => vi.advanceTimersByTime(2000))
    expect(useTour.getState()).toMatchObject({ step: null, presenting: false })
    expect(getByTestId('autopilot-fade')).toHaveStyle({ opacity: '0' })
  })
})
