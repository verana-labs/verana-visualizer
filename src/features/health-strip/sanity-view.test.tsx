import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { failing, stubNetwork } from '@/features/chain-stats/chain-fixture'
import { testnetCfg } from '@/features/trust-check/trust-fixture'
import { SanityView } from './sanity-view'

afterEach(() => vi.unstubAllGlobals())

describe('SanityView', () => {
  it('lists every method with pass/fail, HTTP status and latency, and the resolved config', async () => {
    stubNetwork(failing('/cosmos/staking/v1beta1/pool', 500))
    render(<SanityView cfg={testnetCfg} format="html" />)
    const table = await screen.findByRole('table', { name: /checks/i })
    const row = (method: string) => {
      const cell = within(table).getByText(method)
      return cell.closest('tr') as HTMLElement
    }
    expect(within(row('chain.stakingPool')).getByText('fail')).toBeInTheDocument()
    expect(within(row('chain.stakingPool')).getByText('500')).toBeInTheDocument()
    expect(within(row('chain.inflation')).getByText('pass')).toBeInTheDocument()
    expect(within(row('chain.inflation')).getByText('200')).toBeInTheDocument()
    expect(within(row('chain.inflation')).getByText(/\d+ ms/)).toBeInTheDocument()
    expect(screen.getByText(/1 failing/)).toBeInTheDocument()
    const config = screen.getByRole('region', { name: /network config/i })
    expect(config).toHaveTextContent('https://idx.testnet.verana.network')
    expect(config).toHaveTextContent('vna-testnet-1')
  })

  it('runs again on demand', async () => {
    const fetchMock = stubNetwork()
    render(<SanityView cfg={testnetCfg} format="html" />)
    await screen.findByText(/all \d+ passing/)
    const first = fetchMock.mock.calls.length
    await userEvent.click(screen.getByRole('button', { name: 'Run again' }))
    await screen.findByText(/all \d+ passing/)
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(first * 2)
  })

  it('renders a machine-readable JSON report for the deploy check', async () => {
    stubNetwork()
    render(<SanityView cfg={testnetCfg} format="json" />)
    const pre = await screen.findByTestId('health-json')
    await vi.waitFor(() => expect(pre).toHaveAttribute('data-state', 'done'))
    const report = JSON.parse(pre.textContent ?? '') as {
      ok: boolean
      network: { chainId: string }
      results: unknown[]
    }
    expect(report.ok).toBe(true)
    expect(report.network.chainId).toBe('vna-testnet-1')
    expect(report.results.length).toBeGreaterThan(30)
    expect(screen.queryByRole('table')).toBeNull()
  })
})
