import { describe, expect, it } from 'vitest'
import { buildNetworkModel, type EntityId, type RawNetwork } from '@/domain/network-model'
import { recordedNetwork } from '../../../tests/support/recorded'
import { countedParticipants, ecosystemMembers } from './entity-facts'

const raw: RawNetwork = recordedNetwork()
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
