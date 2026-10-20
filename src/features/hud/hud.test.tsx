import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
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

describe('Hud', () => {
  it('shows the network, block and headline figures from the model', () => {
    render(<Hud cfg={config('testnet')} />)
    expect(screen.getByText('testnet')).toBeInTheDocument()
    expect(screen.getByText(/block 1,?234/)).toBeInTheDocument()
    expect(figure('ecosystems')).toBe(String(model.ecosystems.length))
    expect(figure('participants')).toBe(String(model.participants.length))
    const issued = model.raw.participants
      .filter((p) => model.entities.has(`participant:${p.id}`))
      .reduce((sum, p) => sum + Number(p.issued), 0)
    expect(figure('credentials issued')).toBe(issued.toLocaleString('en-US'))
    expect(figure('services')).toBe('0 / 0')
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
    window.history.replaceState(null, '', '/?lens=trust')
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
