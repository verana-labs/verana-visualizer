import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { TrustDeposit } from '@/lib/api/schemas'
import { recorded, testnetModel } from '../../../tests/support/recorded'
import { EconomicsPanel } from './economics-panel'
import type { EconomicsData } from './load-economics'

const model = testnetModel()
const deposit = recorded<TrustDeposit>('trust-deposit')

const query = { method: 'GET' as const, url: 'https://idx.testnet.verana.network/v4/trust-deposit/params', headers: {} }

const data = (deposits: Map<number, TrustDeposit | null>): EconomicsData => ({
  rates: { trustDepositRate: 0.05, userAgentRewardRate: 0.1, walletUserAgentRewardRate: 0.1 },
  exchangeRates: [],
  deposits,
  series: [
    { timestamp: '2026-10-15T00:00:00Z', weight: 100000, slashed: 0 },
    { timestamp: '2026-10-16T00:00:00Z', weight: 100000, slashed: 0 },
  ],
  tuRate: null,
  queries: { tdParams: query },
})

describe('EconomicsPanel', () => {
  it('says there are no trust deposits on devnet instead of showing zeros', () => {
    render(
      <EconomicsPanel
        chainId="vna-devnet-1"
        model={model}
        state={{ status: 'ready', data: data(new Map([[1, null]])) }}
        onOpenSimulation={vi.fn()}
      />
    )
    expect(screen.getByText('No trust deposits on vna-devnet-1')).toBeInTheDocument()
    expect(screen.queryByText(/^0 VNA$/)).toBeNull()
  })

  it('does not chart a trust weight that has always been zero', () => {
    const flat = data(new Map([[1, null]]))
    flat.series = flat.series.map((point) => ({ ...point, weight: 0 }))
    render(
      <EconomicsPanel
        chainId="vna-devnet-1"
        model={model}
        state={{ status: 'ready', data: flat }}
        onOpenSimulation={vi.fn()}
      />
    )
    expect(screen.getByText(/No trust weight recorded since 2026-10-15/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Cumulative trust weight')).toBeNull()
  })

  it('lists real deposits, the live rates, the fee rules and the history', () => {
    render(
      <EconomicsPanel
        chainId="vna-testnet-1"
        model={model}
        state={{
          status: 'ready',
          data: data(
            new Map([
              [1, { ...deposit, corporation_id: 1 }],
              [2, deposit],
              [3, null],
            ])
          ),
        }}
        onOpenSimulation={vi.fn()}
      />
    )
    expect(screen.getByTestId('deposit-total')).toHaveTextContent('0.1 VNA')
    expect(screen.getByText(/2 corporations hold a trust deposit/)).toBeInTheDocument()
    expect(screen.getByText(/trust_deposit_rate 5%/)).toBeInTheDocument()
    expect(screen.getByText(/validation 1 VNA/)).toBeInTheDocument()
    expect(screen.getByText(/No slashes recorded/)).toBeInTheDocument()
    expect(screen.getByLabelText('Cumulative trust weight')).toBeInTheDocument()
    expect(screen.getByText(/now 0\.1 VNA/)).toBeInTheDocument()
    expect(screen.getByText(/Corporation deposits/)).toBeInTheDocument()
    expect(screen.getByText(/controlling corporation’s deposit/)).toBeInTheDocument()
    expect(screen.getByText(/not each ecosystem’s own/)).toBeInTheDocument()
  })

  it('shows a loading and an error state, never a fallback', () => {
    const { rerender } = render(
      <EconomicsPanel chainId="vna-testnet-1" model={model} state={{ status: 'loading' }} onOpenSimulation={vi.fn()} />
    )
    expect(screen.getByText(/Reading trust deposits/)).toBeInTheDocument()
    rerender(
      <EconomicsPanel
        chainId="vna-testnet-1"
        model={model}
        state={{ status: 'error', message: 'GET /v4/trust-deposit/params failed with status 500' }}
        onOpenSimulation={vi.fn()}
      />
    )
    expect(screen.getByRole('alert')).toHaveTextContent('status 500')
  })

  it('opens the simulator', async () => {
    const open = vi.fn()
    render(
      <EconomicsPanel
        chainId="vna-testnet-1"
        model={model}
        state={{ status: 'ready', data: data(new Map()) }}
        onOpenSimulation={open}
      />
    )
    await userEvent.setup().click(screen.getByRole('button', { name: /what-if simulator/i }))
    expect(open).toHaveBeenCalled()
  })

  it('stacks below the HUD with its own scroll instead of sliding under it', () => {
    const hud = document.createElement('div')
    hud.dataset.testid = 'hud'
    hud.getBoundingClientRect = () => ({ bottom: 232 }) as DOMRect
    document.body.appendChild(hud)
    render(
      <EconomicsPanel chainId="vna-testnet-1" model={model} state={{ status: 'loading' }} onOpenSimulation={vi.fn()} />
    )
    const panel = screen.getByLabelText('Economics')
    expect(panel.style.top).toBe('244px')
    expect(panel.style.maxHeight).toBe('calc(100vh - 310px)')
    expect(panel.className).toMatch(/overflow-y-auto/)
    hud.remove()
  })
})
