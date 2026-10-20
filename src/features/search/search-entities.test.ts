import { describe, expect, it } from 'vitest'
import type { Entity, EntityId, NetworkModel } from '@/domain/network-model'
import { searchEntities } from './search-entities'
import { testnetModel } from './search-fixture'

const model = testnetModel()
const ids = (query: string) => searchEntities(model, query).map((e) => e.id)
const _kinds = (query: string) => searchEntities(model, query).map((e) => e.kind)

describe('searchEntities', () => {
  it('returns nothing for a blank query', () => {
    expect(ids('   ')).toEqual([])
  })

  it('lists the ECS ecosystem first and ranks ecosystems before participants and agents', () => {
    const results = searchEntities(model, 'ecs')
    expect(results[0].kind).toBe('ecosystem')
    expect(results[0].name).toBe('ECS')
    const order = ['ecosystem', 'participant', 'agent', 'corporation', 'schema']
    const prefixKinds = results.filter((e) => e.name.toLowerCase().startsWith('ecs')).map((e) => order.indexOf(e.kind))
    expect(prefixKinds).toEqual([...prefixKinds].sort((a, b) => a - b))
  })

  it('puts name prefix matches before substring matches', () => {
    const make = (id: EntityId, name: string): [EntityId, Entity] => [
      id,
      { id, kind: 'participant', name, ecosystemId: null, color: '#fff', tier: 2, did: null },
    ]
    const small = { entities: new Map([make('participant:1', 'Zeta Alpha'), make('participant:2', 'Alpha Zeta')]) }
    expect(searchEntities(small as unknown as NetworkModel, 'alpha').map((e) => e.id)).toEqual([
      'participant:2',
      'participant:1',
    ])
  })

  it('finds the agent and every participant for a full DID', () => {
    const did = 'did:webvh:QmYdXVVgL4aJci8CUeV5vYCk6jz3yrHPvoRsfZ1iVFGweM:rental.intexus-dl.testnet.verana.network'
    const found = ids(did)
    expect(found).toContain(`agent:${did}`)
    expect(found).toContain('participant:157')
    expect(found).toContain('participant:156')
    expect(found).toEqual(expect.arrayContaining(model.byDid(did)))
  })

  it('matches a corporation by #34 and by 34', () => {
    expect(ids('#34')).toContain('corporation:34')
    expect(ids('34')).toContain('corporation:34')
    expect(ids('#34')[0]).toBe('corporation:34')
  })

  it('matches an exact entity id first', () => {
    expect(ids('participant:157')[0]).toBe('participant:157')
  })

  it('is case insensitive', () => {
    expect(ids('ECS')).toEqual(ids('ecs'))
  })

  it('caps results at 50 on a model with more than 50 matches', () => {
    const entities = new Map(
      Array.from({ length: 80 }, (_, i): [EntityId, Entity] => [
        `participant:${i}`,
        {
          id: `participant:${i}`,
          kind: 'participant',
          name: `Alpha ${i}`,
          ecosystemId: null,
          color: '#fff',
          tier: 2,
          did: null,
        },
      ])
    )
    const big = { entities } as unknown as NetworkModel
    expect(searchEntities(big, 'alpha')).toHaveLength(50)
  })

  it('never returns proposals', () => {
    const proposal: Entity = {
      id: 'proposal:1',
      kind: 'proposal',
      name: 'Alpha proposal',
      ecosystemId: null,
      color: '#fff',
      tier: 0,
      did: null,
    }
    const withProposal = { entities: new Map([[proposal.id, proposal]]) } as unknown as NetworkModel
    expect(searchEntities(withProposal, 'alpha')).toEqual([])
  })
})
