import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useObservatory } from '@/store/observatory-store'
import { testnetCfg } from '../../../tests/support/network'
import { testnetModel } from '../../../tests/support/recorded'
import { launchHistoryComets } from './history-comets'
import { TimeLens } from './time-lens'
import { FADE_MS, useTimeStore } from './time-store'

const model = testnetModel()
const query = { method: 'GET' as const, url: 'https://idx.testnet.verana.network/v4/ecosystem/list', headers: {} }

vi.mock('./history-comets', () => ({ launchHistoryComets: vi.fn() }))
vi.mock('./use-time-url', () => ({ useTimeUrl: () => null }))
vi.mock('@/scene/use-reduced-motion', () => ({ usePrefersReducedMotion: () => false }))
const timeline = vi.hoisted(() => ({ current: {} as Record<string, unknown> }))
vi.mock('./use-timeline', () => ({ useTimeline: () => timeline.current }))
timeline.current = {
  snapshotAt: async () => ({ model, query }),
  blockTimeAt: async () => '2026-10-20T00:00:00Z',
  nextEventAfter: async () => 50,
  eventsAt: () => [],
  density: [],
  days: [],
  status: 'success',
  error: null,
}

const cfg = testnetCfg

beforeEach(() => {
  vi.mocked(launchHistoryComets).mockClear()
  useTimeStore.getState().reset()
  useTimeStore.getState().setHeight(40)
  useObservatory.setState({ lens: 'time', model, blockHeight: 100 })
})

describe('TimeLens', () => {
  it('drops the comets of a block the user scrubbed away from before they launch', async () => {
    render(<TimeLens cfg={cfg} />)
    await waitFor(() => expect(screen.getByTestId('time-block')).toHaveTextContent('Block 40'))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next event' })).toBeEnabled())
    await userEvent.setup().click(screen.getByRole('button', { name: 'Next event' }))
    await waitFor(() => expect(screen.getByTestId('time-block')).toHaveTextContent('Block 50'))
    await waitFor(() => expect(screen.queryByText(/Reading|loading/i)).toBeNull())
    act(() => useTimeStore.getState().setHeight(70))
    await new Promise((resolve) => setTimeout(resolve, FADE_MS + 300))
    expect(launchHistoryComets).not.toHaveBeenCalled()
  })

  it('still launches the comets of the block it jumped to when the user stays', async () => {
    render(<TimeLens cfg={cfg} />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next event' })).toBeEnabled())
    await userEvent.setup().click(screen.getByRole('button', { name: 'Next event' }))
    await waitFor(() => expect(launchHistoryComets).toHaveBeenCalledTimes(1), { timeout: FADE_MS + 1500 })
  })
})
