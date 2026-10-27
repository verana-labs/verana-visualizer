import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { StatsBucket } from '@/domain/digest'
import { useObservatory } from '@/store/observatory-store'
import { testnetCfg } from '../../../tests/support/network'
import { rawBody, testnetModel } from '../../../tests/support/recorded'
import { useGrowth, WhatChanged } from './growth'
import { Hud } from './hud'

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams('') }))

const recorded = (rawBody('stats') as { buckets: StatsBucket[] }).buckets

const bucket = (day: string, participants: number, delta: number): StatsBucket => ({
  timestamp: `${day}T00:00:00Z`,
  cumulative_participants: participants,
  delta_participants: delta,
  cumulative_active_ecosystems: 14,
  cumulative_issued: 169,
})

const growthLine = (label: string) => {
  const key = screen.getByText(label)
  return within(key.parentElement as HTMLElement).getByTestId('growth').textContent
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  useObservatory.setState({ model: testnetModel(), blockHeight: 1, agentVerdicts: new Map() })
})

afterEach(() => {
  vi.useRealTimers()
  useGrowth.setState({ state: { status: 'loading' } })
})

describe('HUD growth sparklines', () => {
  it('show "+N this week · total" with the same total the HUD figure prints', () => {
    vi.setSystemTime(new Date('2026-10-19T12:00:00Z'))
    useGrowth.setState({
      state: { status: 'ready', buckets: [bucket('2026-09-01', 155, 155), bucket('2026-10-18', 158, 3)] },
    })
    render(<Hud cfg={testnetCfg} />)
    expect(growthLine('participants')).toBe('+3 this week · 157 total')
    expect(growthLine('ecosystems')).toBe('+0 this week · 14 total')
    expect(screen.getAllByTestId('sparkline').length).toBeGreaterThan(0)
  })

  it('label the window "since" the first bucket when history is shorter than a week', () => {
    vi.setSystemTime(new Date('2026-10-20T08:00:00Z'))
    useGrowth.setState({ state: { status: 'ready', buckets: recorded } })
    render(<Hud cfg={testnetCfg} />)
    expect(growthLine('participants')).toBe('+11 since Oct 16 · 157 total')
    expect(growthLine('credentials issued')).toBe('+65 since Oct 16 · 169 total')
    expect(growthLine('ecosystems')).toBe('+12 since Oct 16 · 14 total')
  })

  it('say growth is unavailable when the stats call failed', () => {
    useGrowth.setState({ state: { status: 'error', message: 'HTTP 503' } })
    render(<Hud cfg={testnetCfg} />)
    expect(screen.getByText(/growth unavailable/i)).toBeInTheDocument()
    expect(screen.queryByTestId('growth')).toBeNull()
  })
})

describe('WhatChanged', () => {
  it('lists the real changes for today and this week, and says when nothing changed', async () => {
    vi.setSystemTime(new Date('2026-10-17T12:00:00Z'))
    useGrowth.setState({ state: { status: 'ready', buckets: recorded } })
    const user = userEvent.setup()
    render(<WhatChanged />)
    await user.click(screen.getByRole('button', { name: /what changed/i }))
    expect(screen.getByText('+4 credentials issued')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Week' }))
    expect(screen.getByText(/since Oct 16/)).toBeInTheDocument()
    expect(screen.getByText('+11 participants accredited')).toBeInTheDocument()
    act(() => vi.setSystemTime(new Date('2026-10-20T12:00:00Z')))
    await user.click(screen.getByRole('button', { name: 'Day' }))
    expect(screen.getByText('No changes recorded today')).toBeInTheDocument()
  })
})
