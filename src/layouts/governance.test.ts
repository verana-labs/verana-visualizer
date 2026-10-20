import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { fromGovProposal, fromGroupProposal, withProposals } from '@/domain/governance'
import { testnetModel } from '@/features/search/search-fixture'
import type { GroupProposal } from '@/lib/api/schemas'
import { LENSES, layoutFor } from './index'

const groupProposals = JSON.parse(
  readFileSync(join(process.cwd(), 'tests/fixtures/testnet/group-proposals.json'), 'utf8')
) as GroupProposal[]

const chainProposal = fromGovProposal({
  id: '7',
  status: 'PROPOSAL_STATUS_VOTING_PERIOD',
  title: 'Chain',
  summary: null,
})
const model = withProposals(testnetModel(), [...groupProposals.map(fromGroupProposal), chainProposal])
const distance = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

describe('governance layout', () => {
  const layout = layoutFor('governance', model)

  it('places every entity, proposals included', () => {
    for (const id of model.entities.keys()) expect(layout.positions.has(id), id).toBe(true)
  })

  it('puts each corporation proposal on its corporation', () => {
    const corp = layout.positions.get('corporation:4')
    const proposal = layout.positions.get('proposal:group-36')
    if (!corp || !proposal) throw new Error('missing positions')
    expect(distance(corp, proposal)).toBeGreaterThan(0)
    expect(distance(corp, proposal)).toBeLessThan(4)
  })

  it('keeps proposals of one corporation apart from each other', () => {
    const ofCorp = groupProposals.filter((p) => p.corporation_id === groupProposals[0].corporation_id)
    const points = ofCorp.map((p) => layout.positions.get(`proposal:group-${p.id}`))
    for (let i = 0; i < points.length; i++)
      for (let j = i + 1; j < points.length; j++) {
        const a = points[i]
        const b = points[j]
        if (!a || !b) throw new Error('missing positions')
        expect(distance(a, b)).toBeGreaterThan(0.1)
      }
  })

  it('pulls corporations with an ecosystem out beside their star', () => {
    const corp = [...model.entities.values()].find((e) => e.kind === 'corporation' && e.ecosystemId !== null)
    if (!corp) throw new Error('fixture has no corporation with an ecosystem')
    const star = layout.positions.get(`ecosystem:${corp.ecosystemId}`)
    const at = layout.positions.get(corp.id)
    if (!star || !at) throw new Error('missing positions')
    expect(distance(star, at)).toBeGreaterThan(2.4)
  })

  it('lifts corporations without an ecosystem clear of the chain core', () => {
    const loose = [...model.entities.values()].find((e) => e.kind === 'corporation' && e.ecosystemId === null)
    const at = loose && layout.positions.get(loose.id)
    if (!at) throw new Error('fixture has no corporation without an ecosystem')
    expect(distance(at, layout.corePosition)).toBeGreaterThan(30)
  })

  it('places proposals in every lens so a selected proposal survives a lens switch', () => {
    for (const lens of LENSES) {
      const positions = layoutFor(lens, model).positions
      expect(positions.has('proposal:group-36'), lens).toBe(true)
      expect(positions.has('proposal:7'), lens).toBe(true)
    }
  })
})
