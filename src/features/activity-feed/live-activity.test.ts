import { beforeEach, describe, expect, it } from 'vitest'
import type { IndexerEvent } from '@/lib/api/schemas'
import { useObservatory } from '@/store/observatory-store'
import { testnetModel } from '../../../tests/support/recorded'
import { applyBlock, ingestEvent } from './live-activity'

const model = testnetModel()
const did = model.ecosystems.find((e) => e.did)?.did ?? null

const event = (block: number): IndexerEvent => ({
  type: 'indexer-event',
  event_type: 'UpdateEcosystem',
  did,
  block_height: block,
  tx_hash: `TX${block}`,
  timestamp: '2026-10-20T12:00:00Z',
  payload: { module: 'ec' },
})

beforeEach(() => {
  useObservatory.setState({ model, blockHeight: 100, feed: [], cometLaunch: null })
})

describe('applyBlock', () => {
  it('updates blockHeight from a newer block', () => {
    applyBlock({ block: 101, blockTime: '2026-10-20T12:00:06Z', events: [] })
    expect(useObservatory.getState().blockHeight).toBe(101)
  })

  it('never moves blockHeight backwards or sideways', () => {
    applyBlock({ block: 100, blockTime: '2026-10-20T12:00:00Z', events: [] })
    applyBlock({ block: 99, blockTime: '2026-10-20T11:59:54Z', events: [] })
    expect(useObservatory.getState().blockHeight).toBe(100)
  })

  it('feeds every event of the block and launches its comets', () => {
    applyBlock({ block: 101, blockTime: '2026-10-20T12:00:06Z', events: [event(101)] })
    const { feed, cometLaunch } = useObservatory.getState()
    expect(feed).toHaveLength(1)
    expect(feed[0]).toMatchObject({ name: 'Update ecosystem', module: 'ec', block: 101 })
    expect(cometLaunch?.length).toBeGreaterThan(0)
    expect(cometLaunch?.every((c) => c.color === '#ffffff')).toBe(true)
  })

  it('launches nothing for a block without events', () => {
    applyBlock({ block: 101, blockTime: '2026-10-20T12:00:06Z', events: [] })
    expect(useObservatory.getState().cometLaunch).toBeNull()
    expect(useObservatory.getState().feed).toEqual([])
  })
})

describe('ingestEvent', () => {
  it('leaves blockHeight alone for a replayed past event', () => {
    ingestEvent(event(42))
    expect(useObservatory.getState().blockHeight).toBe(100)
    expect(useObservatory.getState().feed[0].block).toBe(42)
  })
})
