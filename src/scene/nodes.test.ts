import { Color } from 'three'
import { describe, expect, it } from 'vitest'
import type { Entity } from '@/domain/network-model'
import { nodeScale } from './nodes'
import type { SceneNode } from './scene-data'

const star: SceneNode = {
  entity: {
    id: 'ecosystem:2',
    kind: 'ecosystem',
    name: 'ECS',
    ecosystemId: 2,
    color: '#a855f7',
    tier: 0,
    did: null,
  } satisfies Entity,
  size: 2.4,
  color: new Color(),
}
const orb: SceneNode = {
  entity: { id: 'participant:5', kind: 'participant', name: 'P', ecosystemId: 2, color: '#a855f7', tier: 1, did: null },
  size: 0.42,
  color: new Color(),
}

describe('nodeScale', () => {
  it('keeps a selected star and a selected participant at their base size, even under the pointer', () => {
    expect(nodeScale(star, 0, null, 'ecosystem:2')).toBe(2.4)
    expect(nodeScale(star, 0, 'ecosystem:2', 'ecosystem:2')).toBe(2.4)
    expect(nodeScale(orb, 0, null, 'participant:5')).toBe(0.42)
  })

  it('still grows a hovered participant and caps flashing stars at 2.4', () => {
    expect(nodeScale(orb, 0, 'participant:5', null)).toBeCloseTo(0.42 * 1.35)
    expect(nodeScale(star, 1, null, null)).toBe(2.4)
    expect(nodeScale({ ...star, size: 1 }, 0.5, null, null)).toBeCloseTo(1.7)
  })
})
