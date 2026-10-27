import { describe, expect, it } from 'vitest'
import { buildNetworkModel } from '@/domain/network-model'
import type { Participant } from '@/lib/api/schemas'
import { recorded, recordedNetwork } from '../../../tests/support/recorded'
import {
  coverageMatrix,
  expiringSoon,
  onboardingCounts,
  pendingCorporations,
  pendingTasks,
  slashEvents,
} from './registry-data'

const NOW = new Date('2026-10-20T12:00:00Z')
const testnet = recordedNetwork('testnet')
const devnet = recordedNetwork('devnet')
const [base] = testnet.participants

const person = (id: number, patch: Partial<Participant> = {}): Participant => ({
  ...base,
  id,
  op_state: 'VALIDATED',
  revoked: null,
  effective_until: null,
  ...patch,
})

const devnetFlat = {
  ecosystems: [
    {
      id: 1,
      did: 'did:webvh:ecs',
      pending_tasks: 2,
      schemas: [
        {
          id: 1,
          pending_tasks: 2,
          pending_participants: [
            { id: 46, role: 'HOLDER' },
            { id: 32, role: 'HOLDER' },
          ],
        },
      ],
    },
  ],
}

describe('pendingCorporations', () => {
  it('asks only the corporations that own the validator of a PENDING participant', () => {
    expect(pendingCorporations(devnet.participants)).toEqual([2])
  })

  it('asks nobody when nothing is pending', () => {
    expect(pendingCorporations(testnet.participants)).toEqual([])
  })
})

describe('pendingTasks', () => {
  it('flattens pending/flat into one task per participant with the corporation that must act', () => {
    expect(pendingTasks([{ corporationId: 2, flat: devnetFlat }])).toEqual([
      { participantId: 46, role: 'HOLDER', ecosystemId: 1, schemaId: 1, validatorCorporationId: 2 },
      { participantId: 32, role: 'HOLDER', ecosystemId: 1, schemaId: 1, validatorCorporationId: 2 },
    ])
  })
})

describe('onboardingCounts', () => {
  it('counts each op_state, the pending column from pending/flat and the participants', () => {
    const tasks = pendingTasks([{ corporationId: 2, flat: devnetFlat }])
    expect(onboardingCounts(devnet.participants, tasks)).toEqual([
      { state: 'PENDING', count: 2 },
      { state: 'VALIDATED', count: 46 },
      { state: 'TERMINATED', count: 0 },
    ])
  })

  it('adds a task the participant list does not show as pending yet', () => {
    const tasks = [{ participantId: 999, role: 'ISSUER', ecosystemId: 1, schemaId: 1, validatorCorporationId: 2 }]
    expect(onboardingCounts([person(1), person(2, { op_state: 'TERMINATED' })], tasks)).toEqual([
      { state: 'PENDING', count: 1 },
      { state: 'VALIDATED', count: 1 },
      { state: 'TERMINATED', count: 1 },
    ])
  })

  it('counts a participant once, in PENDING when pending/flat says it is pending', () => {
    const tasks = [{ participantId: 2, role: 'ISSUER', ecosystemId: 1, schemaId: 1, validatorCorporationId: 2 }]
    const counts = onboardingCounts([person(1), person(2), person(3, { op_state: 'TERMINATED' })], tasks)
    expect(counts).toEqual([
      { state: 'PENDING', count: 1 },
      { state: 'VALIDATED', count: 1 },
      { state: 'TERMINATED', count: 1 },
    ])
    expect(counts.reduce((sum, c) => sum + c.count, 0)).toBe(3)
  })

  it('falls back to the participant list when pending/flat is unavailable', () => {
    expect(onboardingCounts(testnet.participants, null)).toEqual([
      { state: 'PENDING', count: 0 },
      { state: 'VALIDATED', count: 157 },
      { state: 'TERMINATED', count: 1 },
    ])
  })

  it('keeps an unknown op_state as its own column', () => {
    expect(onboardingCounts([person(1, { op_state: 'SUSPENDED' })], [])).toContainEqual({
      state: 'SUSPENDED',
      count: 1,
    })
  })
})

describe('expiringSoon', () => {
  it('lists effective_until within the next 30 days, soonest first', () => {
    const list = expiringSoon(
      [
        person(1, { effective_until: '2026-11-15T00:00:00Z' }),
        person(2, { effective_until: '2026-10-25T00:00:00Z' }),
        person(3, { effective_until: '2026-11-25T00:00:00Z' }),
        person(4, { effective_until: '2026-10-19T00:00:00Z' }),
        person(5, { effective_until: '2026-10-22T00:00:00Z', revoked: '2026-10-01T00:00:00Z' }),
        person(6, { effective_until: '2026-10-22T00:00:00Z', op_state: 'TERMINATED' }),
        person(7),
      ],
      NOW
    )
    expect(list.map((p) => p.id)).toEqual([2, 1])
  })

  it('is empty on testnet today, where every window ends in 2027', () => {
    expect(expiringSoon(testnet.participants, NOW)).toEqual([])
  })
})

describe('coverageMatrix', () => {
  const model = buildNetworkModel(testnet)
  const matrix = coverageMatrix(model)

  it('has one row per ecosystem and one cell per live schema', () => {
    expect(matrix.map((row) => row.ecosystem.id)).toEqual(model.ecosystems.map((eco) => eco.id))
    const ecs = matrix.find((row) => row.ecosystem.id === 'ecosystem:2')
    expect(ecs?.cells.map((cell) => cell.name)).toEqual([
      'OrganizationCredential',
      'PersonaCredential',
      'ServiceCredential',
      'UserAgentCredential',
      'BadgeCredential',
    ])
  })

  it('counts services as distinct agents whose participants hold the schema', () => {
    const agentsBySchema = new Map<number, Set<string>>()
    for (const agent of model.agents)
      for (const anchor of model.agentAnchors(agent.id)) {
        const p = model.raw.participants.find((row) => `participant:${row.id}` === anchor)
        if (!p || p.op_state === 'TERMINATED') continue
        agentsBySchema.set(p.schema_id, (agentsBySchema.get(p.schema_id) ?? new Set()).add(agent.id))
      }
    const cells = matrix.flatMap((row) => row.cells)
    expect(cells.some((cell) => cell.services > 0)).toBe(true)
    for (const cell of cells) expect(cell.services, cell.name).toBe(agentsBySchema.get(cell.schemaId)?.size ?? 0)
  })

  it('counts the non-terminated participants per schema', () => {
    const cells = matrix.flatMap((row) => row.cells)
    for (const cell of cells)
      expect(cell.participants, cell.name).toBe(
        testnet.participants.filter((p) => p.schema_id === cell.schemaId && p.op_state !== 'TERMINATED').length
      )
  })
})

describe('slashEvents', () => {
  const bucket = (timestamp: string, patch: Record<string, number> = {}) => ({
    timestamp,
    delta_ecosystem_slash_events: 0,
    delta_network_slash_events: 0,
    delta_ecosystem_slashed_amount: 0,
    delta_network_slashed_amount: 0,
    ...patch,
  })

  it('keeps the days with a slash, newest first', () => {
    expect(
      slashEvents([
        bucket('2026-10-15T00:00:00Z'),
        bucket('2026-10-16T00:00:00Z', { delta_ecosystem_slash_events: 1, delta_ecosystem_slashed_amount: 500 }),
        bucket('2026-10-18T00:00:00Z', { delta_network_slash_events: 2, delta_network_slashed_amount: 70 }),
      ])
    ).toEqual([
      { day: '2026-10-18', ecosystemEvents: 0, networkEvents: 2, amount: 70 },
      { day: '2026-10-16', ecosystemEvents: 1, networkEvents: 0, amount: 500 },
    ])
  })

  it('is empty on the real testnet series', () => {
    expect(slashEvents(recorded<{ buckets: Record<string, unknown>[] }>('stats', 'testnet').buckets)).toEqual([])
  })

  it('fails on a non-numeric slash field', () => {
    expect(() => slashEvents([{ timestamp: 'x', delta_network_slash_events: 'many' }])).toThrow(/non-numeric/)
  })
})
