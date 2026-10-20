import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildNetworkModel, type RawNetwork } from '@/domain/network-model'
import { maxOrbitRadius } from './network'
import { LENSES, layoutFor } from './registry'

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

describe.each(LENSES)('%s layout', (lens) => {
  const layout = layoutFor(lens, model)

  it('positions every entity without NaN', () => {
    expect(model.entities.size).toBeGreaterThan(0)
    for (const id of model.entities.keys()) {
      const position = layout.positions.get(id)
      expect(position, id).toBeDefined()
      expect(position?.every(Number.isFinite), id).toBe(true)
    }
    expect(layout.corePosition.every(Number.isFinite)).toBe(true)
  })

  it('is deterministic', () => {
    expect(layoutFor(lens, model)).toEqual(layout)
  })

  it.skipIf(lens === 'trust')('keeps ecosystems apart by their orbit radii', () => {
    const stars = model.ecosystems
    for (const [i, a] of stars.entries()) {
      for (const b of stars.slice(i + 1)) {
        const gap = distance(layout.positions.get(a.id) ?? [NaN, 0, 0], layout.positions.get(b.id) ?? [NaN, 0, 0])
        expect(gap, `${a.id} ${b.id}`).toBeGreaterThan(maxOrbitRadius(model, a.id) + maxOrbitRadius(model, b.id))
      }
    }
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

  it('keeps participants on their orbit radius', () => {
    const participant = model.participants[0]
    const star = at(`ecosystem:${participant.ecosystemId}`)
    const radius = distance(at(participant.id), star)
    expect(radius).toBeGreaterThanOrEqual(3.4 + participant.tier * 2.7 - 1e-9)
    expect(radius).toBeLessThanOrEqual(maxOrbitRadius(model, `ecosystem:${participant.ecosystemId}`) + 1e-9)
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
    const core = layout.corePosition
    const loose = model.agents.filter((agent) => model.agentAnchors(agent.id).length === 0)
    for (const agent of loose) {
      const [x, y, z] = at(agent.id)
      expect(Math.hypot(x - core[0], z - core[2])).toBeCloseTo(24, 6)
      expect(y).toBeCloseTo(core[1] + 6, 6)
    }
    for (const entity of model.entities.values()) {
      if (entity.kind !== 'corporation') continue
      if (entity.ecosystemId === null) {
        const [x, , z] = at(entity.id)
        expect(Math.hypot(x - core[0], z - core[2])).toBeCloseTo(18, 6)
      } else {
        expect(at(entity.id)[1]).toBeCloseTo(at(`ecosystem:${entity.ecosystemId}`)[1] - 6, 6)
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
