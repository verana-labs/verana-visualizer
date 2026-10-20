import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildNetworkModel, type RawNetwork } from '@/domain/network-model'
import { resolveNetworkConfig } from '@/lib/env'
import { useObservatory } from '@/store/observatory-store'
import { Hud } from './hud'
import { NetworkSwitch } from './network-switch'

const fixture = <T,>(name: string): T =>
  JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/testnet', `${name}.json`), 'utf8')) as T

const raw: RawNetwork = {
  ecosystems: fixture('ecosystems'),
  schemas: fixture('schemas'),
  participants: fixture('participants'),
  corporations: fixture('corporations'),
  dids: fixture<{ dids: string[] }>('dids').dids,
}
const model = buildNetworkModel(raw)

const config = (network: string, extra: Record<string, string> = {}) =>
  resolveNetworkConfig({
    NEXT_PUBLIC_VERANA_INDEXER_BASE_URL: `https://idx.${network}.verana.network`,
    NEXT_PUBLIC_VERANA_RPC_ENDPOINT: `https://rpc.${network}.verana.network`,
    NEXT_PUBLIC_VERANA_REST_ENDPOINT: `https://api.${network}.verana.network`,
    NEXT_PUBLIC_VERANA_CHAIN_ID: `vna-${network}-1`,
    ...extra,
  })

const figure = (label: string) => {
  const key = screen.getByText(label)
  return within(key.parentElement as HTMLElement).getByTestId('figure').textContent
}

beforeEach(() => {
  useObservatory.setState({ model, blockHeight: 1234, agentVerdicts: new Map() })
})

const searchParams = vi.hoisted(() => ({ value: '' }))
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(searchParams.value) }))

describe('Hud', () => {
  it('shows the network, block and headline figures from the model', () => {
    render(<Hud cfg={config('testnet')} />)
    expect(screen.getByText('testnet')).toBeInTheDocument()
    expect(screen.getByText(/block 1,?234/)).toBeInTheDocument()
    expect(figure('ecosystems')).toBe(String(model.ecosystems.length))
    const indexerTotal = raw.ecosystems.filter((e) => !e.archived).reduce((sum, e) => sum + e.participants, 0)
    expect(figure('participants')).toBe(String(indexerTotal))
    expect(figure('participants')).toBe('157')
    expect(figure('credentials issued')).toBe('169')
    expect(figure('services')).toBe('0 / 0')
  })

  it('hides the live dot until the block height is known', () => {
    useObservatory.setState({ blockHeight: null })
    const { container, rerender } = render(<Hud cfg={config('testnet')} />)
    expect(container.querySelector('[data-testid="live-dot"]')).toBeNull()
    useObservatory.setState({ blockHeight: 1234 })
    rerender(<Hud cfg={config('testnet')} />)
    const dot = container.querySelector('[data-testid="live-dot"]')
    expect(dot).not.toBeNull()
    expect(dot?.className).not.toMatch(/#[0-9a-f]{6}/i)
  })

  it('counts trusted over resolved services from the verdicts', () => {
    const [a, b, c] = model.agents.map((agent) => agent.id)
    useObservatory.setState({
      agentVerdicts: new Map([
        [a, true],
        [b, true],
        [c, false],
      ]),
    })
    render(<Hud cfg={config('testnet')} />)
    expect(figure('services')).toBe('2 / 3')
  })
})

describe('NetworkSwitch', () => {
  it('links to the peer visualizer keeping the current search', () => {
    searchParams.value = 'lens=trust'
    render(<NetworkSwitch cfg={config('testnet')} />)
    const link = screen.getByRole('link', { name: /devnet/ })
    expect(link).toHaveAttribute('href', 'https://vis.devnet.verana.network?lens=trust')
  })

  it('is hidden without a peer', () => {
    const cfg = { ...config('testnet'), peerVisualizerUrl: null }
    render(<NetworkSwitch cfg={cfg} />)
    expect(screen.queryByRole('link')).toBeNull()
  })
})
