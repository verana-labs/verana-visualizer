import { describe, expect, it } from 'vitest'
import { fromGroupProposal, withProposals } from '@/domain/governance'
import { MODULE_COLORS } from '@/features/activity-feed/activity'
import type { GroupProposal, IndexerEvent } from '@/lib/api/schemas'
import { recorded, testnetModel } from '../../../tests/support/recorded'
import { governanceComets } from './governance-comets'

const groupProposals = recorded<GroupProposal[]>('group-proposals')
const model = withProposals(testnetModel(), groupProposals.map(fromGroupProposal))

const vote = (payload: Record<string, unknown>): IndexerEvent => ({
  type: 'indexer-event',
  event_type: 'Vote',
  did: null,
  block_height: 14769,
  tx_hash: 'CAFE',
  timestamp: '2026-10-14T22:24:44Z',
  payload: {
    module: 'group',
    action: 'vote',
    entity_type: 'GroupProposal',
    entity_id: '3',
    corporation_id: 3,
    ...payload,
  },
})

describe('governanceComets', () => {
  it('flies a vote comet to the proposal it touches', () => {
    expect(governanceComets(vote({}), model)).toEqual([{ target: 'proposal:group-3', color: MODULE_COLORS.group }])
  })

  it('falls back to the corporation when the proposal is not loaded', () => {
    expect(governanceComets(vote({ entity_id: '9999' }), model)).toEqual([
      { target: 'corporation:3', color: MODULE_COLORS.group },
    ])
  })

  it('ignores events of other modules and unknown corporations', () => {
    expect(governanceComets(vote({ module: 'pp' }), model)).toEqual([])
    expect(governanceComets(vote({ entity_id: '9999', corporation_id: 99999 }), model)).toEqual([])
  })
})
