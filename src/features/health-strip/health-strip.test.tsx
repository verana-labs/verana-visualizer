import { act, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { failing, stubNetwork } from '@/features/chain-stats/chain-fixture'
import { testnetCfg } from '@/features/trust-check/trust-fixture'
import { HealthStrip, REFRESH_MS } from './health-strip'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const flush = async () => {
  await act(async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve()
  })
}

describe('HealthStrip', () => {
  it('shows a compact row of service dots and the indexer lag', async () => {
    stubNetwork()
    render(<HealthStrip cfg={testnetCfg} />)
    const strip = await screen.findByTestId('health-strip')
    expect(await within(strip).findByText(/lag 2 blocks/)).toBeInTheDocument()
    for (const name of ['indexer', 'graph', 'chain'])
      expect(within(strip).getByTestId(`health-${name}`)).toHaveAttribute('data-up', 'true')
    expect(within(strip).getByTestId('health-lag')).toHaveAttribute('data-tone', 'green')
    expect(strip).not.toHaveTextContent(/last transaction/i)
  })

  it('turns the lag amber beyond 3 blocks', async () => {
    stubNetwork((url) =>
      url.pathname === '/v4/indexer/block-height'
        ? Response.json({ type: 'block-indexed', height: 990, timestamp: '2026-10-20T10:00:00Z' })
        : undefined
    )
    render(<HealthStrip cfg={testnetCfg} />)
    expect(await screen.findByText(/lag 10 blocks/)).toBeInTheDocument()
    expect(screen.getByTestId('health-lag')).toHaveAttribute('data-tone', 'amber')
  })

  it('shows a failed service as down', async () => {
    stubNetwork(failing('/health', 502))
    render(<HealthStrip cfg={testnetCfg} />)
    await screen.findByText(/lag 2 blocks/)
    expect(screen.getByTestId('health-graph')).toHaveAttribute('data-up', 'false')
  })

  it('expands to show each service in detail', async () => {
    stubNetwork()
    render(<HealthStrip cfg={testnetCfg} />)
    await screen.findByText(/lag 2 blocks/)
    const toggle = screen.getByRole('button', { name: /service health/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByTestId('health-detail')).toBeNull()
    act(() => toggle.click())
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const detail = screen.getByTestId('health-detail')
    expect(detail).toHaveTextContent(/running/)
    expect(detail).toHaveTextContent(/last applied block/)
    expect(detail).toHaveTextContent(/head 1,000/)
    expect(detail).toHaveTextContent(/behind the chain head/)
  })

  it('refreshes every 30 seconds and shows when it last checked', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
    vi.setSystemTime(new Date('2026-10-20T10:00:00Z'))
    const fetchMock = stubNetwork()
    render(<HealthStrip cfg={testnetCfg} />)
    await flush()
    expect(REFRESH_MS).toBe(30_000)
    const first = fetchMock.mock.calls.length
    expect(first).toBeGreaterThan(0)
    expect(screen.getByTestId('health-checked')).toHaveTextContent('10:00:00')
    await act(async () => {
      vi.advanceTimersByTime(REFRESH_MS)
    })
    await flush()
    expect(fetchMock.mock.calls.length).toBe(first * 2)
    expect(screen.getByTestId('health-checked')).toHaveTextContent('10:00:30')
  })
})
