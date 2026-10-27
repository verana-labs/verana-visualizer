import { describe, expect, it } from 'vitest'
import type { EntityId } from '@/domain/network-model'
import { TRUST_HOP_MS, type TrustCheck } from '@/domain/trust-check'
import { testnetModel } from '../../tests/support/recorded'
import { agentStrength } from './links'
import { dimOf, type FocusSets } from './scene-focus'
import { sparkAt, traceablePath } from './trust-trace'

const model = testnetModel()
const PAPAPO_AGENT = 'agent:did:webvh:QmbMzijTyACD4RgPscJmifpH4BXXCVq9yYjn36jcBntdDv:verana.papapo.shoes' as EntityId

const check = (path: EntityId[]): TrustCheck => ({
  did: 'did:x',
  path,
  pathSource: 'local',
  pathError: null,
  sharedBy: 1,
  hops: [],
  verdict: { trusted: false, evaluatedAtBlock: 1, evaluatedAtTime: null, expiresAtTime: null },
  raw: { resolve: null, graph: null },
})

describe('the trust trace', () => {
  it('moves the spark 0.55 s per hop and ends at the root', () => {
    expect(TRUST_HOP_MS).toBe(550)
    expect(sparkAt(3, 0)).toEqual({ segment: 0, t: 0 })
    expect(sparkAt(3, 275)).toEqual({ segment: 0, t: 0.5 })
    expect(sparkAt(3, 550)).toEqual({ segment: 1, t: 0 })
    expect(sparkAt(3, 1649)?.segment).toBe(2)
    expect(sparkAt(3, 1650)).toBeNull()
    expect(sparkAt(0, 0)).toBeNull()
  })

  it('traces only the path entities the model renders', () => {
    const path: EntityId[] = [PAPAPO_AGENT, 'participant:158', 'participant:999999', 'participant:5', 'ecosystem:2']
    expect(traceablePath(check(path), model)).toEqual([PAPAPO_AGENT, 'participant:158', 'participant:5', 'ecosystem:2'])
    expect(traceablePath(check([PAPAPO_AGENT]), model)).toBeNull()
    expect(traceablePath(null, model)).toBeNull()
  })

  it('lights the path and dims everything else, over the selection', () => {
    const sets: FocusSets = {
      related: new Set<EntityId>(['ecosystem:3']),
      hover: null,
      trace: new Set<EntityId>([PAPAPO_AGENT, 'participant:158', 'participant:5', 'ecosystem:2']),
    }
    expect(dimOf(sets, 'participant:158')).toBe(1)
    expect(dimOf(sets, 'ecosystem:3')).toBeLessThan(0.2)
    expect(agentStrength(sets, PAPAPO_AGENT, 'participant:158')).toBeGreaterThan(0.8)
    expect(agentStrength(sets, PAPAPO_AGENT, 'participant:12')).toBeLessThan(0.05)
  })
})
