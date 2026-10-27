import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChainStatsPanel } from './chain-stats-panel'
import type { StatRow } from './load-chain-stats'

const rows: StatRow[] = [
  {
    id: 'blockHeight',
    label: 'Block height',
    definition: 'Latest block the chain committed',
    state: 'ok',
    value: '1,000',
  },
  {
    id: 'supply',
    label: 'Total supply',
    definition: 'All VNA in existence',
    state: 'unavailable',
    value: null,
    reason: 'GET https://api.testnet.verana.network/cosmos/bank/v1beta1/supply failed with status 500',
  },
  { id: 'inflation', label: 'Inflation', definition: 'Yearly mint rate', state: 'loading', value: null },
]

const orbs = [
  {
    address: 'veranavaloper1x',
    moniker: '<img src=x onerror=alert(1)>',
    share: 1,
    size: 2,
    angle: 0,
    active: true,
  },
]

describe('ChainStatsPanel', () => {
  it('shows each stat with its definition and "unavailable" for a failed one, never 0', () => {
    render(<ChainStatsPanel chainId="vna-testnet-1" rows={rows} validators={{ status: 'ready', orbs }} />)
    const panel = screen.getByRole('region', { name: 'Chain' })
    const row = (label: string) => within(panel).getByText(label).closest('[data-stat]') as HTMLElement
    expect(row('Block height')).toHaveTextContent('1,000')
    expect(row('Block height')).toHaveTextContent('Latest block the chain committed')
    expect(row('Total supply')).toHaveTextContent('unavailable')
    expect(row('Total supply')).not.toHaveTextContent(/\b0\b/)
    expect(within(row('Total supply')).getByText('unavailable')).toHaveAttribute('title', expect.stringMatching(/500/))
    expect(row('Inflation')).toHaveTextContent('…')
  })

  it('renders validator monikers as text only', () => {
    const { container } = render(
      <ChainStatsPanel chainId="vna-testnet-1" rows={rows} validators={{ status: 'ready', orbs }} />
    )
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('shows the validators as unavailable when their call fails', () => {
    render(
      <ChainStatsPanel chainId="vna-testnet-1" rows={rows} validators={{ status: 'error', message: 'status 500' }} />
    )
    expect(screen.getByText(/Validators unavailable: status 500/)).toBeInTheDocument()
  })
})
