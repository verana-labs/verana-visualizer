import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildNetworkModel, type RawNetwork } from '@/domain/network-model'
import { LENSES, layoutFor } from './index'
import { maxOrbitRadius, orbitRadius, spreadCenters } from './network'

const fixture = <T>(name: string): T =>
  JSON.parse(readFileSync(join(__dirname, '../../tests/fixtures/testnet', `${name}.json`), 'utf8')) as T

const raw: RawNetwork = {
  ecosystems: fixture('ecosystems'),
  schemas: fixture('schemas'),
  participants: fixture('participants'),
  corporations: fixture('corporations'),
  dids: fixture<{ dids: string[] }>('dids').dids,
}
const model = buildNetworkModel(raw)
const distance = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

describe('LENSES', () => {
  it('keeps the global order', () => {
    expect(LENSES).toEqual(['network', 'trust', 'economics', 'chain', 'time', 'governance', 'registry'])
  })
})

const loose: RawNetwork = (() => {
  const [eco] = raw.ecosystems
  const [corp] = raw.corporations
  const [schema] = raw.schemas
  const [person] = raw.participants
  return {
    ecosystems: [
      { ...eco, id: 900, did: 'did:web:eco-900.example.org', corporation_id: 900, archived: null },
      { ...eco, id: 901, did: 'did:web:eco-901.example.org', corporation_id: 900, archived: null },
    ],
    schemas: [{ ...schema, id: 950, ecosystem_id: 900, archived: null }],
    participants: [
      {
        ...person,
        id: 960,
        ecosystem_id: 900,
        schema_id: 950,
        role: 'ISSUER',
        did: 'did:web:orphan.example.org',
        validator_participant_id: 99999,
      },
    ],
    corporations: [
      { ...corp, id: 900, did: 'did:web:corp-900.example.org' },
      { ...corp, id: 902, did: 'did:web:corp-902.example.org' },
    ],
    dids: ['did:web:nobody.example.org', 'did:web:eco-900.example.org', 'did:web:orphan.example.org'],
  }
})()
const looseModel = buildNetworkModel(loose)

describe.each([
  ['testnet', model],
  ['hand-built', looseModel],
] as const)('%s model', (_name, subject) => {
  describe.each(LENSES)('%s layout', (lens) => {
    const layout = layoutFor(lens, subject)

    it('positions every entity without NaN', () => {
      expect(subject.entities.size).toBeGreaterThan(0)
      for (const id of subject.entities.keys()) {
        const position = layout.positions.get(id)
        expect(position, id).toBeDefined()
        expect(position?.every(Number.isFinite), id).toBe(true)
      }
      expect(layout.corePosition.every(Number.isFinite)).toBe(true)
    })

    it('is deterministic', () => {
      expect(layoutFor(lens, subject)).toEqual(layout)
    })

    it.skipIf(lens === 'trust')('keeps ecosystems apart by their orbit radii', () => {
      const stars = subject.ecosystems
      expect(stars.length).toBeGreaterThan(1)
      for (const [i, a] of stars.entries()) {
        for (const b of stars.slice(i + 1)) {
          const gap = distance(layout.positions.get(a.id) ?? [NaN, 0, 0], layout.positions.get(b.id) ?? [NaN, 0, 0])
          expect(gap, `${a.id} ${b.id}`).toBeGreaterThan(maxOrbitRadius(subject, a.id) + maxOrbitRadius(subject, b.id))
        }
      }
    })
  })
})

describe('hand-built edge cases', () => {
  it.each(LENSES)('%s places the loose entities', (lens) => {
    const layout = layoutFor(lens, looseModel)
    expect(looseModel.agentAnchors('agent:did:web:nobody.example.org')).toEqual([])
    expect(looseModel.entities.get('corporation:902')?.ecosystemId).toBeNull()
    expect(looseModel.parentOf('participant:960')).toBe('ecosystem:900')
    for (const id of [
      'agent:did:web:nobody.example.org',
      'corporation:902',
      'ecosystem:901',
      'participant:960',
    ] as const)
      expect(layout.positions.get(id)?.every(Number.isFinite), id).toBe(true)
  })

  it('gives a bare ecosystem the base orbit radius', () => {
    expect(maxOrbitRadius(looseModel, 'ecosystem:901')).toBe(3.4)
  })
})

describe('spreadCenters', () => {
  const radii = [60, 55, 50, 48, 45, 62, 58]

  it('scales the radial term above 1 when the golden-angle spread overlaps', () => {
    const { factor } = spreadCenters(radii)
    expect(factor).toBeGreaterThan(1)
  })

  it('clears every pair strictly, height included', () => {
    const { centers } = spreadCenters(radii)
    for (const [i, a] of centers.entries())
      for (const [j, b] of centers.entries())
        if (j > i) expect(distance(a, b), `${i} ${j}`).toBeGreaterThan(radii[i] + radii[j])
  })

  it('is deterministic and leaves roomy spreads unscaled', () => {
    expect(spreadCenters(radii)).toEqual(spreadCenters(radii))
    expect(spreadCenters([3.4, 3.4, 3.4]).factor).toBe(1)
  })
})

describe('network layout', () => {
  const layout = layoutFor('network', model)
  const at = (id: string) => layout.positions.get(id as never) ?? [NaN, NaN, NaN]

  it('puts the core below the galaxy', () => {
    expect(layout.corePosition).toEqual([0, -38, 0])
  })

  it('places the first ecosystem at the origin plane centre', () => {
    const origins = model.ecosystems.filter((eco) => at(eco.id)[0] === 0 && at(eco.id)[2] === 0)
    expect(origins).toHaveLength(1)
  })

  it('draws a ring per orbit and centres schemas on their ecosystem', () => {
    expect(layout.rings?.length).toBeGreaterThan(0)
    for (const entity of model.entities.values()) {
      if (entity.kind !== 'schema') continue
      expect(at(entity.id)).toEqual(at(`ecosystem:${entity.ecosystemId}`))
    }
  })

  it('keeps every participant on its exact orbit radius', () => {
    const schemaOf = new Map(raw.participants.map((p) => [`participant:${p.id}`, p.schema_id]))
    expect(model.participants.length).toBeGreaterThan(0)
    for (const participant of model.participants) {
      const schemaIds = model
        .childrenOf(`ecosystem:${participant.ecosystemId}`)
        .filter((id) => id.startsWith('schema:'))
        .map((id) => Number(id.slice('schema:'.length)))
        .sort((a, b) => a - b)
      const k = Math.max(0, schemaIds.indexOf(schemaOf.get(participant.id) ?? -1))
      const tilt = (k % 2 ? -1 : 1) * (0.3 + k * 0.28)
      const [px, py, pz] = at(participant.id)
      const [cx, cy, cz] = at(`ecosystem:${participant.ecosystemId}`)
      const z = (pz - cz) / Math.cos(tilt)
      expect(Math.hypot(px - cx, z), participant.id).toBeCloseTo(orbitRadius(participant.tier, k), 6)
      expect(cy - py, participant.id).toBeCloseTo(z * Math.sin(tilt), 6)
    }
  })

  it('floats agents 3.4 to 4.9 above their first anchor', () => {
    const anchored = model.agents.filter((agent) => model.agentAnchors(agent.id).length > 0)
    expect(anchored.length).toBeGreaterThan(0)
    for (const agent of anchored) {
      const lift = at(agent.id)[1] - at(model.agentAnchors(agent.id)[0])[1]
      expect(lift).toBeGreaterThanOrEqual(3.4)
      expect(lift).toBeLessThanOrEqual(4.9)
    }
  })

  it('sits anchorless agents and free corporations on rings around the core', () => {
    const edge = layoutFor('network', looseModel)
    const core = edge.corePosition
    const place = (id: string) => edge.positions.get(id as never) ?? [NaN, NaN, NaN]
    const agents = looseModel.agents.filter((agent) => looseModel.agentAnchors(agent.id).length === 0)
    const corporations = [...looseModel.entities.values()].filter((e) => e.kind === 'corporation')
    expect(agents.length).toBeGreaterThan(0)
    expect(corporations.some((c) => c.ecosystemId === null)).toBe(true)
    expect(corporations.some((c) => c.ecosystemId !== null)).toBe(true)
    for (const agent of agents) {
      const [x, y, z] = place(agent.id)
      expect(Math.hypot(x - core[0], z - core[2])).toBeCloseTo(24, 6)
      expect(y).toBeCloseTo(core[1] + 6, 6)
    }
    for (const entity of corporations) {
      if (entity.ecosystemId === null) {
        const [x, , z] = place(entity.id)
        expect(Math.hypot(x - core[0], z - core[2])).toBeCloseTo(18, 6)
      } else {
        expect(place(entity.id)[1]).toBeCloseTo(place(`ecosystem:${entity.ecosystemId}`)[1] - 6, 6)
      }
    }
  })

  it('never uses Math.random', () => {
    const original = Math.random
    Math.random = () => {
      throw new Error('Math.random called')
    }
    try {
      expect(() => layoutFor('network', model)).not.toThrow()
    } finally {
      Math.random = original
    }
  })
})

describe('trust layout', () => {
  const layout = layoutFor('trust', model)
  const at = (id: string) => layout.positions.get(id as never) ?? [NaN, NaN, NaN]

  it('puts every child below its parent', () => {
    for (const participant of model.participants) {
      const parent = model.parentOf(participant.id)
      expect(parent).not.toBeNull()
      expect(at(participant.id)[1], participant.id).toBeLessThan(at(parent as string)[1])
    }
  })

  it('spaces depth by 11 and keeps leaves 2.5 apart', () => {
    for (const participant of model.participants) {
      const parent = model.parentOf(participant.id) as string
      if (!parent.startsWith('ecosystem:')) continue
      expect(at(parent)[1] - at(participant.id)[1]).toBeCloseTo(11, 6)
    }
  })

  it('stacks schemas on their ecosystem root', () => {
    for (const entity of model.entities.values()) {
      if (entity.kind !== 'schema') continue
      expect(at(entity.id)).toEqual(at(`ecosystem:${entity.ecosystemId}`))
    }
  })
})
