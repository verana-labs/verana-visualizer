import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildNetworkModel } from '@/domain/network-model'
import { Hud } from '@/features/hud/hud'
import { Inspector } from '@/features/inspector/inspector'
import { testnetModel } from '@/features/search/search-fixture'
import { testnetCfg } from '@/features/trust-check/trust-fixture'
import { networkLayout } from '@/layouts/network'
import type { IndexerEvent } from '@/lib/api/schemas'
import { useObservatory } from '@/store/observatory-store'
import { launchHistoryComets } from './history-comets'
import { useTimeStore } from './time-store'
import { missingFromLive } from './timeline'

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }))

const events = JSON.parse(
  readFileSync(join(process.cwd(), 'tests/fixtures/testnet/events.json'), 'utf8')
) as IndexerEvent[]

beforeEach(() => {
  useTimeStore.getState().reset()
  useObservatory.setState({
    model: testnetModel(),
    blockHeight: 96135,
    selected: null,
    feed: [],
    cometLaunch: null,
    trustCheck: null,
    agentVerdicts: new Map(),
  })
})

describe('replayed history', () => {
  it('launches comets but never enters the live feed', () => {
    const touching = events.filter((ev) => ev.did)
    launchHistoryComets(touching, testnetModel())
    expect(useObservatory.getState().feed).toEqual([])
    expect(useObservatory.getState().cometLaunch?.length).toBeGreaterThan(0)
  })
})

describe('live figures while in the Time lens', () => {
  it('tags the HUD as live and not at the scrubbed block', () => {
    render(<Hud cfg={testnetCfg} />)
    expect(screen.queryByText(/not at block/)).toBeNull()
    act(() => useTimeStore.getState().setHeight(7070))
    expect(screen.getByText('Live · not at block 7,070')).toBeInTheDocument()
  })

  it('tags the inspector and says when the selected entity is not present at the block', () => {
    useObservatory.setState({ selected: 'ecosystem:14' })
    render(<Inspector frontendUrl="https://app.testnet.verana.network" chainId="vna-testnet-1" />)
    expect(screen.queryByText(/not at block/)).toBeNull()
    act(() => {
      useTimeStore.getState().setHeight(7070)
      useTimeStore.getState().setAbsent(new Set(['ecosystem:14']))
    })
    expect(screen.getByText('Live · not at block 7,070')).toBeInTheDocument()
    expect(screen.getByText('Not present at block 7,070')).toBeInTheDocument()
  })
})

describe('entities gone from the live chain', () => {
  it('counts snapshot ids the live model no longer has', () => {
    const live = testnetModel()
    const raw = live.raw
    const past = buildNetworkModel({
      ...raw,
      corporations: [...raw.corporations, { ...raw.corporations[0], id: 999_999 }],
    })
    expect(missingFromLive(live, past)).toEqual(['corporation:999999'])
  })
})

describe('rings at a block', () => {
  it('tags every ecosystem orbit ring with its ecosystem so it can fade with it', () => {
    const model = testnetModel()
    const rings = networkLayout(model).rings ?? []
    expect(rings.length).toBeGreaterThan(0)
    expect(rings.every((ring) => ring.ecosystem && model.entities.has(ring.ecosystem))).toBe(true)
  })
})
