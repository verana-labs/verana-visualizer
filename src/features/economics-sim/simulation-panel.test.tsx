import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Rates } from '@/domain/economics'
import { testnetModel } from '@/features/search/search-fixture'
import type { ExchangeRate } from '@/lib/api/schemas'
import { SimulationPanel } from './simulation-panel'

const model = testnetModel()
const LIVE: Rates = { trustDepositRate: 0.05, userAgentRewardRate: 0.1, walletUserAgentRewardRate: 0.1 }
const NOW = new Date('2026-10-20T12:00:00Z')
const emptyRates = JSON.parse(
  readFileSync(join(process.cwd(), 'tests/fixtures/testnet/exchange-rates.json'), 'utf8')
) as ExchangeRate[]

const TU_RATE = {
  id: 4,
  base_asset_type: 'TU',
  base_asset: 'tu',
  quote_asset_type: 'COIN',
  quote_asset: 'uvna',
  rate: '2000000',
  rate_scale: 6,
  state: true,
  updated: '2026-10-19T08:00:00Z',
  expires: '2026-10-21T08:00:00Z',
} as ExchangeRate

const renderPanel = (exchangeRates: ExchangeRate[] = emptyRates) =>
  render(
    <SimulationPanel
      chainId="vna-testnet-1"
      model={model}
      rates={LIVE}
      exchangeRates={exchangeRates}
      now={NOW}
      onClose={vi.fn()}
    />
  )

describe('SimulationPanel', () => {
  it('is a separate frame visibly labelled as a simulation', () => {
    renderPanel()
    const panel = screen.getByRole('dialog', { name: /simulation/i })
    expect(within(panel).getByText('Simulation')).toBeInTheDocument()
    expect(panel.className).toMatch(/border-dashed/)
  })

  it('starts from the spec example and prices it with the live td params', () => {
    renderPanel()
    expect(screen.getByTestId('payer-total')).toHaveTextContent('-18.75 TU')
    expect(screen.getByTestId('payer-deposit')).toHaveTextContent('+0.75 TU')
    expect(screen.getByText(/trust_deposit_rate 5%/)).toBeInTheDocument()
  })

  it('recomputes the verification split after a fee edit', async () => {
    const user = userEvent.setup()
    renderPanel()
    await user.click(screen.getByRole('tab', { name: 'Verification' }))
    expect(screen.getByTestId('payer-total')).toHaveTextContent('-71.25 TU')
    const issuerFee = screen.getByLabelText('Issuer fee')
    await user.clear(issuerFee)
    await user.type(issuerFee, '0')
    expect(screen.getByTestId('payer-total')).toHaveTextContent('-33.75 TU')
  })

  it('shows TU only while the exchange-rate list is empty', () => {
    renderPanel()
    const panel = screen.getByRole('dialog', { name: /simulation/i })
    expect(panel.textContent).not.toMatch(/VNA/)
    expect(within(panel).getByText(/No TU exchange rate on vna-testnet-1/)).toBeInTheDocument()
  })

  it('shows VNA next to TU with the rate source once a live rate exists', () => {
    renderPanel([TU_RATE])
    expect(screen.getByTestId('payer-total')).toHaveTextContent('-18.75 TU')
    expect(screen.getByTestId('payer-total')).toHaveTextContent('VNA')
    expect(screen.getByText(/rate #4/)).toBeInTheDocument()
    expect(screen.getByText(/2026-10-19T08:00:00Z/)).toBeInTheDocument()
  })

  it('pre-fills beneficiaries from a real TU-priced schema by walking up the validator tree', async () => {
    const user = userEvent.setup()
    renderPanel()
    await user.selectOptions(screen.getByLabelText('Start from'), '16')
    expect(screen.getByLabelText('Issuer')).toHaveValue('129')
    expect(screen.getByLabelText('Ecosystem #106 fee')).toHaveValue(0)
    expect(screen.getByLabelText('Issuer grantor #128 fee')).toHaveValue(0)
    expect(screen.getByTestId('payer-total')).toHaveTextContent(/^0 TU/)
  })

  it('does not offer schemas priced in another asset as TU', () => {
    renderPanel()
    const options = within(screen.getByLabelText('Start from')).getAllByRole('option')
    expect(options.map((o) => o.getAttribute('value'))).not.toContain('1')
    expect(screen.getByText(/8 schemas price fees in another asset/)).toBeInTheDocument()
  })
})
