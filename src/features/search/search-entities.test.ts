import { describe, expect, it } from 'vitest'
import { searchEntities } from './search-entities'
import { testnetModel } from './search-fixture'

const model = testnetModel()
const ids = (query: string) => searchEntities(model, query).map((e) => e.id)
const kinds = (query: string) => searchEntities(model, query).map((e) => e.kind)

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
    const results = searchEntities(model, 'ecs')
    const firstSubstring = results.findIndex((e) => !e.name.toLowerCase().startsWith('ecs'))
    const lastPrefix = results.findLastIndex((e) => e.name.toLowerCase().startsWith('ecs'))
    if (firstSubstring >= 0) expect(lastPrefix).toBeLessThan(firstSubstring)
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

  it('is case insensitive and caps results at 50', () => {
    expect(ids('ECS')).toEqual(ids('ecs'))
    expect(searchEntities(model, 'a').length).toBeLessThanOrEqual(50)
    expect(kinds('a').length).toBe(50)
  })
})
