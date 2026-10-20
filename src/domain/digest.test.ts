import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { growthOf, periodLabel, type StatsBucket, whatChanged } from './digest'

const recorded = (
  JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/testnet/stats.json'), 'utf8')) as {
    buckets: StatsBucket[]
  }
).buckets

const bucket = (day: string, deltas: Record<string, number>, cumulative: Record<string, number> = {}): StatsBucket => ({
  timestamp: `${day}T00:00:00Z`,
  ...Object.fromEntries(Object.entries(deltas).map(([k, v]) => [`delta_${k}`, v])),
  ...Object.fromEntries(Object.entries(cumulative).map(([k, v]) => [`cumulative_${k}`, v])),
})

const history = [
  bucket('2026-09-01', { participants: 40, active_ecosystems: 3, issued: 10 }),
  bucket('2026-10-12', { participants: 1 }),
  bucket('2026-10-16', { participants: 2, active_ecosystems: 1, issued: 3, verified: 0 }),
  bucket('2026-10-19', { issued: 0, active_schemas: 0 }),
]
const now = new Date('2026-10-19T21:00:00Z')

describe('whatChanged', () => {
  it('sums the real deltas over the last 7 daily buckets into sentences', () => {
    expect(whatChanged(history, 'week', now)).toEqual([
      '+1 ecosystem created',
      '+2 participants accredited',
      '+3 credentials issued',
    ])
  })

  it('says nothing for zero deltas', () => {
    expect(whatChanged(history, 'day', now)).toEqual([])
    expect(whatChanged([], 'week', now)).toEqual([])
  })

  it('pluralises and keeps net decreases honest', () => {
    const buckets = [bucket('2026-10-19', { participants: -2, active_ecosystems: 2, ecosystem_slash_events: 1 })]
    expect(whatChanged(buckets, 'day', now)).toEqual([
      '+2 ecosystems created',
      '-2 participants (net)',
      '+1 slash recorded',
    ])
  })

  it('reads the recorded testnet buckets', () => {
    expect(whatChanged(recorded, 'week', new Date('2026-10-17T12:00:00Z'))).toEqual([
      '+12 ecosystems created',
      '+11 participants accredited',
      '+15 credential schemas published',
      '+65 credentials issued',
    ])
    expect(whatChanged(recorded, 'day', new Date('2026-10-17T12:00:00Z'))).toEqual([
      '+2 ecosystems created',
      '+2 credential schemas published',
      '+4 credentials issued',
    ])
  })
})

describe('backfilled first bucket', () => {
  const backfilled = [
    bucket('2026-10-15', { participants: 146, issued: 104 }, { participants: 146, issued: 104 }),
    bucket('2026-10-16', { participants: 11, issued: 61 }, { participants: 157, issued: 165 }),
  ]
  const at = new Date('2026-10-17T09:00:00Z')

  it('is excluded from the digest because its delta is the whole indexed history', () => {
    expect(whatChanged(backfilled, 'week', at)).toEqual(['+11 participants accredited', '+61 credentials issued'])
  })

  it('is excluded from growth, and the window starts at the end of day 1', () => {
    expect(growthOf(backfilled, 'participants', 'week', at)).toMatchObject({ delta: 11, label: 'since Oct 16' })
    expect(periodLabel(backfilled, 'week', at)).toBe('since Oct 16')
  })

  it('only applies when delta equals cumulative in the first bucket', () => {
    const real = [bucket('2026-10-15', { participants: 4 }, { participants: 146 })]
    expect(whatChanged(real, 'week', at)).toEqual(['+4 participants accredited'])
    expect(periodLabel(real, 'week', at)).toBe('since Oct 15')
  })
})

describe('growthOf', () => {
  const buckets = [
    bucket('2026-09-01', { participants: 150 }, { participants: 150 }),
    bucket('2026-10-16', { participants: 3 }, { participants: 153 }),
    bucket('2026-10-18', { participants: 5 }, { participants: 158 }),
  ]

  it('labels the window and gives the new-per-period next to the total', () => {
    expect(growthOf(buckets, 'participants', 'week', now)).toEqual({
      delta: 8,
      total: 158,
      label: 'this week',
      series: [150, 153, 158],
    })
  })

  it('says "since" the first bucket when the stats window is shorter than the period', () => {
    expect(growthOf(recorded, 'participants', 'week', new Date('2026-10-20T08:00:00Z'))).toEqual({
      delta: 11,
      total: 157,
      label: 'since Oct 16',
      series: [146, 157, 157],
    })
  })

  it('has nothing to show without buckets', () => {
    expect(growthOf([], 'issued', 'week', now)).toBeNull()
  })
})
