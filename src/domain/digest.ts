import type { z } from 'zod'
import type { statsBucketSchema } from '@/lib/api/schemas'

export type StatsBucket = z.infer<typeof statsBucketSchema>
export type DigestPeriod = 'day' | 'week'
export type GrowthMetric = 'participants' | 'active_ecosystems' | 'issued'

export interface Growth {
  delta: number
  total: number
  label: string
  series: number[]
}

interface Change {
  keys: readonly string[]
  one: string
  many: string
  net: string
}

const DAY_MS = 86_400_000

const CHANGES: readonly Change[] = [
  { keys: ['active_ecosystems'], one: 'ecosystem created', many: 'ecosystems created', net: 'active ecosystems' },
  { keys: ['archived_ecosystems'], one: 'ecosystem archived', many: 'ecosystems archived', net: 'archived ecosystems' },
  { keys: ['participants'], one: 'participant accredited', many: 'participants accredited', net: 'participants' },
  {
    keys: ['active_schemas'],
    one: 'credential schema published',
    many: 'credential schemas published',
    net: 'credential schemas',
  },
  { keys: ['issued'], one: 'credential issued', many: 'credentials issued', net: 'credentials issued' },
  { keys: ['verified'], one: 'credential verified', many: 'credentials verified', net: 'credentials verified' },
  {
    keys: ['ecosystem_slash_events', 'network_slash_events'],
    one: 'slash recorded',
    many: 'slashes recorded',
    net: 'slashes',
  },
]

const numberAt = (bucket: StatsBucket, key: string): number => {
  const value = bucket[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

const formatCount = (n: number) => n.toLocaleString('en-US')

function windowStart(period: DigestPeriod, now: Date): number {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return period === 'week' ? today - 6 * DAY_MS : today
}

const isBackfill = (bucket: StatsBucket, key: string) => {
  const delta = numberAt(bucket, `delta_${key}`)
  return delta !== 0 && delta === numberAt(bucket, `cumulative_${key}`)
}

const backfilled = (buckets: readonly StatsBucket[]) =>
  buckets.length > 0 && CHANGES.some(({ keys }) => keys.some((key) => isBackfill(buckets[0], key)))

function deltaOf(buckets: readonly StatsBucket[], key: string, period: DigestPeriod, now: Date): number {
  const start = windowStart(period, now)
  return buckets.reduce(
    (sum, b, i) =>
      Date.parse(b.timestamp) < start || (i === 0 && isBackfill(b, key)) ? sum : sum + numberAt(b, `delta_${key}`),
    0
  )
}

export function periodLabel(buckets: readonly StatsBucket[], period: DigestPeriod, now: Date = new Date()): string {
  const indexed = buckets.length > 0 ? Date.parse(buckets[0].timestamp) : Number.NaN
  const first = backfilled(buckets) ? indexed + DAY_MS : indexed
  if (Number.isFinite(first) && first > windowStart(period, now)) {
    return `since ${new Date(first).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`
  }
  return period === 'week' ? 'this week' : 'today'
}

export function whatChanged(buckets: StatsBucket[], period: DigestPeriod, now: Date = new Date()): string[] {
  return CHANGES.flatMap(({ keys, one, many, net }) => {
    const delta = keys.reduce((sum, key) => sum + deltaOf(buckets, key, period, now), 0)
    if (delta === 0) return []
    if (delta < 0) return [`-${formatCount(-delta)} ${net} (net)`]
    return [`+${formatCount(delta)} ${delta === 1 ? one : many}`]
  })
}

export function growthOf(
  buckets: readonly StatsBucket[],
  metric: GrowthMetric,
  period: DigestPeriod,
  now: Date = new Date()
): Growth | null {
  if (buckets.length === 0) return null
  const series = buckets.map((b) => numberAt(b, `cumulative_${metric}`))
  return {
    delta: deltaOf(buckets, metric, period, now),
    total: series[series.length - 1],
    label: periodLabel(buckets, period, now),
    series,
  }
}
