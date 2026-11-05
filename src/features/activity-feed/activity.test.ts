import { describe, expect, it } from 'vitest'
import { appendFeed } from '@/domain/activity'
import type { IndexerEvent } from '@/lib/api/schemas'
import { recorded, testnetModel } from '../../../tests/support/recorded'
import {
  COMETS_PER_EVENT,
  cometsFor,
  feedItemOf,
  humanizeEventType,
  MODULE_COLORS,
  moduleColor,
  relativeAge,
} from './activity'

const events = recorded<IndexerEvent[]>('events')
const model = testnetModel()

const event = (overrides: Partial<IndexerEvent> = {}, payload: Record<string, unknown> = {}): IndexerEvent => ({
  type: 'indexer-event',
  event_type: 'CreateNewCorporation',
  did: null,
  block_height: 44_201,
  tx_hash: 'ABC',
  timestamp: '2026-10-17T12:00:00Z',
  payload: { module: 'co', ...payload },
  ...overrides,
})

describe('module colours', () => {
  it('uses the exact module palette', () => {
    expect(MODULE_COLORS).toEqual({
      co: '#c4b5fd',
      ec: '#ffffff',
      cs: '#60a5fa',
      pp: '#34d399',
      td: '#fbbf24',
      de: '#94a3b8',
      di: '#f472b6',
      xr: '#2dd4bf',
      gf: '#e9d5ff',
      group: '#a78bfa',
    })
  })

  it('falls back to the chain-core lavender for an unknown module', () => {
    expect(moduleColor('zz')).toBe('#c4b5fd')
    expect(moduleColor(undefined)).toBe('#c4b5fd')
  })
})

describe('humanizeEventType', () => {
  it('turns PascalCase into a sentence', () => {
    expect(humanizeEventType('CreateNewCorporation')).toBe('Create new corporation')
  })

  it('keeps acronyms readable', () => {
    expect(humanizeEventType('GrantVSOperatorAuthorization')).toBe('Grant VS operator authorization')
    expect(humanizeEventType('SetParticipantOPToValidated')).toBe('Set participant OP to validated')
  })
})

describe('cometsFor', () => {
  it('spawns one comet per touched entity, coloured by module', () => {
    const ev = events.find((e) => e.payload.module === 'pp' && e.did && model.byDid(e.did).length > 0)
    if (!ev) throw new Error('fixture has no pp event touching a known DID')
    const comets = cometsFor(ev, model)
    expect(comets.length).toBeGreaterThan(0)
    expect(comets.length).toBeLessThanOrEqual(COMETS_PER_EVENT)
    expect(new Set(comets.map((c) => c.target)).size).toBe(comets.length)
    for (const comet of comets) {
      expect(comet.color).toBe('#34d399')
      expect(['ecosystem', 'participant', 'agent']).toContain(model.entities.get(comet.target)?.kind)
    }
  })

  it('caps comets at 6 per event', () => {
    const dids = [...new Set(model.participants.map((p) => p.did).filter((d): d is string => !!d))].slice(0, 10)
    expect(dids.length).toBeGreaterThan(6)
    const comets = cometsFor(event({ did: dids[0] }, { module: 'de', related_dids: dids }), model)
    expect(comets).toHaveLength(6)
    expect(comets.every((c) => c.color === '#94a3b8')).toBe(true)
  })

  it('spawns nothing for an event that touched no known entity', () => {
    expect(cometsFor(event({ did: 'did:web:nobody.example' }), model)).toEqual([])
  })
})

describe('feed', () => {
  it('keeps the newest 6 items, newest first', () => {
    let feed = appendFeed([], feedItemOf(event({ block_height: 1 }), model))
    for (let block = 2; block <= 9; block++) feed = appendFeed(feed, feedItemOf(event({ block_height: block }), model))
    expect(feed.map((item) => item.block)).toEqual([9, 8, 7, 6, 5, 4])
    expect(new Set(feed.map((item) => item.key)).size).toBe(6)
  })

  it('describes an event with a human name, its module and colour', () => {
    const item = feedItemOf(event({ block_height: 44_201 }, { module: 'co' }), model)
    expect(item).toMatchObject({ name: 'Create new corporation', module: 'co', color: '#c4b5fd', block: 44_201 })
  })

  it('names the ecosystem an event touched', () => {
    const eco = model.ecosystems.find((e) => e.did)
    if (!eco?.did) throw new Error('fixture has no ecosystem with a DID')
    expect(feedItemOf(event({ did: eco.did }, { module: 'ec' }), model).where).toBe(eco.name)
  })

  it('falls back to the event action when the type is missing', () => {
    expect(feedItemOf(event({ event_type: '' }, { action: 'start_participant_op' }), model).name).toBe(
      'Start participant op'
    )
  })
})

describe('relativeAge', () => {
  const now = Date.parse('2026-10-20T12:00:00Z')
  it('reads the age of the event itself', () => {
    expect(relativeAge('2026-10-17T12:00:00Z', now)).toBe('3 days ago')
    expect(relativeAge('2026-10-20T11:59:58Z', now)).toBe('now')
    expect(relativeAge('2026-10-20T11:15:00Z', now)).toBe('45 minutes ago')
  })

  it('returns null instead of throwing for an unparseable timestamp', () => {
    expect(relativeAge('yesterday-ish', now)).toBeNull()
  })
})
