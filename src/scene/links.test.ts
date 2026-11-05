import { describe, expect, it } from 'vitest'
import type { EntityId } from '@/domain/network-model'
import { agentStrength } from './links'

const agent: EntityId = 'agent:did:web:a.example'
const anchor: EntityId = 'participant:1'
const other: EntityId = 'agent:did:web:b.example'
const otherAnchor: EntityId = 'participant:2'

describe('agentStrength', () => {
  it('lights related agent links softly and leaves unrelated ones at the idle level', () => {
    const sets = { related: new Set<EntityId>([agent, anchor]), hover: null, trace: null }
    const idle = agentStrength({ related: null, hover: null, trace: null }, other, otherAnchor)
    expect(agentStrength(sets, agent, anchor)).toBe(0.25)
    expect(agentStrength(sets, other, otherAnchor)).toBe(idle)
    expect(idle).toBe(0.035)
  })

  it('brightens hovered agent links when nothing is selected', () => {
    expect(
      agentStrength({ related: null, hover: new Set<EntityId>([agent, anchor]), trace: null }, agent, anchor)
    ).toBe(0.9)
  })
})
