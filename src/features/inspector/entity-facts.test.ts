import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildNetworkModel, type EntityId, type RawNetwork } from '@/domain/network-model'
import { countedParticipants, ecosystemMembers } from './entity-facts'

const fixture = <T>(name: string): T =>
  JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/testnet', `${name}.json`), 'utf8')) as T

const raw: RawNetwork = {
  ecosystems: fixture('ecosystems'),
  schemas: fixture('schemas'),
  participants: fixture('participants'),
  corporations: fixture('corporations'),
  dids: fixture<{ dids: string[] }>('dids').dids,
}
const model = buildNetworkModel(raw)

describe('countedParticipants', () => {
  it('matches the indexer participants figure of every testnet ecosystem', () => {
    for (const eco of raw.ecosystems.filter((e) => !e.archived)) {
      const entity = model.entities.get(`ecosystem:${eco.id}`)
      if (!entity) throw new Error(`ecosystem ${eco.id} missing from the model`)
      expect(countedParticipants(model, ecosystemMembers(model, entity).participants), `ecosystem ${eco.id}`).toBe(
        eco.participants
      )
    }
  })

  it('matches the indexer participants figure of every live schema', () => {
    for (const schema of raw.schemas.filter((s) => !s.archived)) {
      const members = model.participants.filter((p) => {
        const row = raw.participants.find((r) => `participant:${r.id}` === p.id)
        return row?.schema_id === schema.id
      })
      expect(countedParticipants(model, members), `schema ${schema.id}`).toBe(schema.participants)
    }
  })

  it('keeps terminated participants in the scene model', () => {
    const terminated = raw.participants.filter((p) => p.op_state === 'TERMINATED')
    expect(terminated.length).toBeGreaterThan(0)
    for (const p of terminated) expect(model.entities.has(`participant:${p.id}` as EntityId)).toBe(true)
  })
})
