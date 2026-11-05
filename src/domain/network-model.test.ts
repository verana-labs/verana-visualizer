import { describe, expect, it } from 'vitest'
import type { IndexerEvent, Participant } from '@/lib/api/schemas'
import { recorded, recordedNetwork } from '../../tests/support/recorded'
import { replayWindows, touchedEntities } from './events'
import { agentName, ecosystemName, schemaTitle } from './names'
import { buildNetworkModel, type EntityId, type RawNetwork } from './network-model'
import { participantState } from './participant-state'
import { ROLES } from './roles'

const raw: RawNetwork = recordedNetwork()
const events = recorded<IndexerEvent[]>('events')

describe('buildNetworkModel', () => {
  const model = buildNetworkModel(raw)

  it('keeps live ecosystems and their participants', () => {
    const live = new Set(raw.ecosystems.filter((e) => !e.archived).map((e) => e.id))
    expect(model.ecosystems).toHaveLength(14)
    expect(model.participants).toHaveLength(
      raw.participants.filter((p) => p.ecosystem_id && live.has(p.ecosystem_id)).length
    )
  })

  it('ends every participant chain at an ecosystem', () => {
    for (const p of model.participants) {
      expect(model.parentOf(p.id)).not.toBeNull()
      expect(model.chainToRoot(p.id).at(-1)).toMatch(/^ecosystem:/)
    }
  })

  it('walks the issuer chain', () => {
    expect(model.chainToRoot('participant:158')).toEqual(['participant:158', 'participant:5', 'ecosystem:2'])
  })

  it('creates one agent per DID and anchors by participant, ecosystem or corporation', () => {
    expect(model.agents).toHaveLength(new Set(raw.dids).size)
    const ecosystem = raw.ecosystems[0]
    const corporation = raw.corporations[1]
    const custom = buildNetworkModel({
      ...raw,
      participants: [],
      dids: [ecosystem.did, corporation.did as string, 'did:web:nobody.example.org'],
    })
    expect(custom.agentAnchors(`agent:${ecosystem.did}`)).toContain(`ecosystem:${ecosystem.id}`)
    expect(custom.agentAnchors(`agent:${corporation.did}`)).toContain(`corporation:${corporation.id}`)
    expect(custom.agentAnchors('agent:did:web:nobody.example.org')).toEqual([])
  })

  it('parents orphans to their ecosystem star', () => {
    const base = raw.participants.find((p) => p.id === 158) as Participant
    const make = (id: number, validator: number | null, ecosystemId = 2): Participant => ({
      ...base,
      id,
      ecosystem_id: ecosystemId,
      validator_participant_id: validator,
    })
    const custom = buildNetworkModel({
      ...raw,
      participants: [make(900, null), make(901, 99999), make(902, 5), make(903, 904), make(904, 903)],
    })
    expect(custom.parentOf('participant:900')).toBe('ecosystem:2')
    expect(custom.parentOf('participant:901')).toBe('ecosystem:2')
    expect(custom.parentOf('participant:902')).toBe('ecosystem:2')
    expect(custom.parentOf('participant:903')).toBe('ecosystem:2')
    expect(custom.parentOf('participant:904')).toBe('ecosystem:2')
  })

  it('parents a participant to its ecosystem when the validator lives in another one', () => {
    const base = raw.participants.find((p) => p.id === 158) as Participant
    const other = raw.participants.find((p) => p.ecosystem_id !== 2) as Participant
    const custom = buildNetworkModel({
      ...raw,
      participants: [other, { ...base, validator_participant_id: other.id }],
    })
    expect(custom.entities.has(`participant:${other.id}`)).toBe(true)
    expect(custom.entities.get(`participant:${other.id}`)?.ecosystemId).not.toBe(2)
    expect(custom.parentOf('participant:158')).toBe('ecosystem:2')
  })

  it('parents a participant to its ecosystem when the validator is missing', () => {
    const base = raw.participants.find((p) => p.id === 158) as Participant
    const custom = buildNetworkModel({ ...raw, participants: [{ ...base, validator_participant_id: 99999 }] })
    expect(custom.parentOf('participant:158')).toBe('ecosystem:2')
  })

  it('parents a corporation to the ecosystem it controls', () => {
    const eco = raw.ecosystems.find((e) => e.id === 2)
    const corpId = eco?.corporation_id as number
    expect(model.parentOf(`corporation:${corpId}`)).toBe('ecosystem:2')
    expect(model.entities.get(`corporation:${corpId}`)?.ecosystemId).toBe(2)
    expect(model.chainToRoot(`corporation:${corpId}`)).toEqual([`corporation:${corpId}`, 'ecosystem:2'])
    expect(model.childrenOf('ecosystem:2')).toContain(`corporation:${corpId}`)
  })

  it('keeps a corporation controlling no live ecosystem as a root', () => {
    const controllers = new Set(raw.ecosystems.map((e) => e.corporation_id))
    const free = raw.corporations.find((c) => !controllers.has(c.id)) as { id: number }
    expect(model.parentOf(`corporation:${free.id}`)).toBeNull()
    expect(model.entities.get(`corporation:${free.id}`)?.ecosystemId).toBeNull()
  })

  it('exposes role colors and tiers', () => {
    expect(ROLES).toEqual({
      ECOSYSTEM: { color: '#a855f7', tier: 0 },
      ISSUER_GRANTOR: { color: '#3b82f6', tier: 1 },
      VERIFIER_GRANTOR: { color: '#64748b', tier: 1 },
      ISSUER: { color: '#22c55e', tier: 2 },
      VERIFIER: { color: '#f97316', tier: 2 },
      HOLDER: { color: '#ec4899', tier: 3 },
    })
  })

  it('drops participants and schemas of archived ecosystems', () => {
    const archived = raw.ecosystems.map((e) => (e.id === 2 ? { ...e, archived: '2026-01-01T00:00:00Z' } : e))
    const custom = buildNetworkModel({ ...raw, ecosystems: archived })
    expect(custom.entities.has('ecosystem:2')).toBe(false)
    expect(custom.entities.has('participant:158')).toBe(false)
    expect(custom.participants.every((p) => p.ecosystemId !== 2)).toBe(true)
  })

  it('relates the chain, descendants and anchored agents', () => {
    const did = raw.participants.find((p) => p.id === 158)?.did as string
    const agent: EntityId = `agent:${did}`
    const related = model.related('participant:5')
    expect(related.has('ecosystem:2')).toBe(true)
    expect(related.has('participant:158')).toBe(true)
    expect(related.has(agent)).toBe(true)
    expect(model.related('participant:158').has(agent)).toBe(true)
    expect(model.neighbors('participant:5').has('ecosystem:2')).toBe(true)
    expect(model.neighbors('participant:5').has('participant:158')).toBe(true)
    expect(model.neighbors('participant:158').has(agent)).toBe(true)
    expect(model.agentAnchors('participant:158')).toEqual([agent])
    expect(model.agentAnchors(agent)).toContain('participant:158')
    expect(model.childrenOf('ecosystem:2')).toContain('participant:5')
  })

  it('looks entities up by DID, agent first', () => {
    const did = raw.participants.find((p) => p.id === 158)?.did as string
    const ids = model.byDid(did)
    expect(ids[0]).toBe(`agent:${did}`)
    expect(ids).toContain('participant:158')
  })
})

describe('names', () => {
  it('derives ecosystem names from the host', () => {
    expect(ecosystemName('did:webvh:Qm123:ecs-ecosystem.testnet.verana.network')).toBe('ECS')
    expect(ecosystemName('did:webvh:Qm123:vesta-repair-network.playground.demos.testnet.verana.network')).toBe(
      'Vesta Repair'
    )
    expect(ecosystemName('did:web:health-alliance.example.org')).toBe('Health Alliance')
  })

  it('skips generic leading host labels', () => {
    expect(ecosystemName('did:webvh:QmQvUk:ecosystem.intexus-dl.testnet.verana.network')).toBe('Intexus DL')
    expect(ecosystemName('did:web:ecosystem.health-alliance.example.org')).toBe('Health Alliance')
    expect(agentName('did:webvh:QmbMzi:verana.papapo.shoes')).toBe('Papapo')
    expect(ecosystemName('did:webvh:QmbMzi:verana.papapo.shoes')).toBe('Papapo')
    expect(agentName('did:web:www.example.org')).toBe('Example')
  })

  it('skips DID paths and decodes ports', () => {
    expect(agentName('did:web:health-alliance.example.org:users:alice')).toBe('Health Alliance')
    expect(agentName('did:webvh:QmSCID:vesta-repair-network.example.org:path:x')).toBe('Vesta Repair Network')
    expect(ecosystemName('did:webvh:QmSCID:vesta-repair-network.example.org:path:x')).toBe('Vesta Repair')
    expect(agentName('did:web:localhost%3A3000')).toBe('Localhost')
  })

  it('keeps suffixes in agent names', () => {
    expect(agentName('did:example:ecs-corp-vna-testnet-1')).toBe('ECS Corp VNA Testnet 1')
  })

  it('returns schema titles as plain strings', () => {
    expect(schemaTitle('{"title":"<img src=x onerror=1>"}', 3)).toBe('<img src=x onerror=1>')
    expect(schemaTitle('not json', 3)).toBe('Schema 3')
    expect(schemaTitle('{"title":42}', 3)).toBe('Schema 3')
  })
})

describe('participantState', () => {
  const now = new Date('2026-10-20T00:00:00Z')
  const base = raw.participants[0]
  const state = (patch: Partial<Participant>) => participantState({ ...base, ...patch }, now)

  it('applies the priority order', () => {
    const all = {
      slashed: '2026-01-01T00:00:00Z',
      repaid: null,
      revoked: '2026-01-01T00:00:00Z',
      effective_until: '2026-02-01T00:00:00Z',
      effective_from: '2027-01-01T00:00:00Z',
    }
    expect(state(all)).toBe('SLASHED')
    expect(state({ ...all, repaid: '2026-03-01T00:00:00Z' })).toBe('REVOKED')
    expect(state({ ...all, slashed: null, revoked: null })).toBe('EXPIRED')
    expect(state({ ...all, slashed: null, revoked: null, effective_until: null })).toBe('FUTURE')
    expect(state({ ...all, slashed: null, revoked: null, effective_until: null, effective_from: null })).toBe('ACTIVE')
  })
})

describe('events', () => {
  const model = buildNetworkModel(raw)
  const event = (patch: Partial<IndexerEvent>): IndexerEvent => ({ ...events[0], ...patch })

  it('maps DIDs to entities and agents without duplicates', () => {
    const did = raw.participants.find((p) => p.id === 158)?.did as string
    const touched = touchedEntities(event({ did, payload: { related_dids: [did] } }), model)
    expect(touched).toContain(`agent:${did}`)
    expect(touched).toContain('participant:158')
    expect(new Set(touched).size).toBe(touched.length)
  })

  it('falls back to the corporation id', () => {
    const touched = touchedEntities(event({ did: null, payload: { related_dids: [], corporation_id: 34 } }), model)
    expect(touched).toEqual<EntityId[]>(['corporation:34'])
  })

  it('returns nothing for unknown references', () => {
    expect(touchedEntities(event({ did: 'did:web:unknown', payload: {} }), model)).toEqual([])
  })

  it('computes replay windows newest first', () => {
    expect(replayWindows(87600)).toEqual([77600, 57600, 37600, 17600, 0])
    expect(replayWindows(500)).toEqual([0])
  })
})
