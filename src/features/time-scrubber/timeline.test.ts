import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildNetworkModel } from '@/domain/network-model'
import { testnetModel } from '@/features/search/search-fixture'
import { testnetCfg } from '@/features/trust-check/trust-fixture'
import { createIndexerClient } from '@/lib/api/indexer'
import type { IndexerEvent } from '@/lib/api/schemas'
import { absentAt, buildDays, buildDensity, loadEvents, loadModelAt, nextChangeAfter } from './timeline'

const fixture = <T>(name: string): T =>
  JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/testnet', `${name}.json`), 'utf8')) as T
const rawBody = (name: string): unknown => fixture<{ body: unknown }>(`raw/${name}`).body

const events = fixture<IndexerEvent[]>('events')
const stats = fixture<{ buckets: { timestamp: string }[] }>('stats')

afterEach(() => vi.unstubAllGlobals())

describe('density strip', () => {
  it('counts every indexer event at its block height', () => {
    const density = buildDensity(events)
    expect(density.reduce((sum, p) => sum + p.count, 0)).toBe(events.length)
    expect(density.map((p) => p.height)).toEqual([...new Set(events.map((e) => e.block_height))].sort((a, b) => a - b))
    expect(density.find((p) => p.height === 7055)?.count).toBe(events.filter((e) => e.block_height === 7055).length)
  })

  it('marks each DAY stats bucket at the first event height of that day', () => {
    const days = buildDays(stats.buckets, events)
    const firstOct15 = events.find((e) => e.timestamp.startsWith('2026-10-15'))
    expect(days.find((d) => d.date === '2026-10-15')?.height).toBe(firstOct15?.block_height)
    expect(days.every((d) => stats.buckets.some((b) => b.timestamp.startsWith(d.date)))).toBe(true)
  })

  it('pages through every event without exceeding the 100 limit and keeps each once', async () => {
    const pages = [events.slice(0, 100), events.slice(90, 100)]
    const calls: { after: number; limit: number }[] = []
    const fetchEvents = vi.fn(async (after: number, limit: number) => {
      calls.push({ after, limit })
      return pages[calls.length - 1] ?? []
    })
    const all = await loadEvents(fetchEvents)
    expect(calls.every((c) => c.limit <= 100)).toBe(true)
    expect(calls[1].after).toBe(events[99].block_height - 1)
    expect(all).toHaveLength(100)
  })

  it('fails loudly when one block holds a full page, since the API cannot page within a block', async () => {
    const crowded = Array.from({ length: 100 }, (_, i) => ({
      ...events[0],
      block_height: 9000,
      payload: { ...events[0].payload, message_index: i },
    }))
    const fetchEvents = vi.fn(async (after: number) => (after < 9000 ? crowded : []))
    await expect(loadEvents(fetchEvents)).rejects.toThrow(/block 9000/)
  })
})

describe('nextChangeAfter', () => {
  it('returns next_change_at from the changes endpoint at that height', async () => {
    const fetchMock = vi.fn(async (_input: string, _init?: RequestInit) => Response.json(rawBody('changes-38000')))
    vi.stubGlobal('fetch', fetchMock)
    const next = await nextChangeAfter(createIndexerClient(testnetCfg), 38000)
    expect(next).toBe(38257)
    const init = fetchMock.mock.calls[0][1]
    expect(new Headers(init?.headers).get('At-Block-Height')).toBe('38000')
  })
})

describe('loadModelAt', () => {
  it('requests every list with At-Block-Height h', async () => {
    const routes: Record<string, string> = {
      '/v4/ecosystem/list': 'ecosystems',
      '/v4/credential-schema/list': 'schemas',
      '/v4/participant/list': 'participants',
      '/v4/corporation/list': 'corporations',
      '/v4/verifiable-trust/dids': 'dids',
    }
    const seen = new Map<string, string | null>()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string, init?: RequestInit) => {
        const path = new URL(input).pathname.replace(/^\/api\/indexer\/at\/\d+/, '')
        seen.set(path, new Headers(init?.headers).get('At-Block-Height'))
        return Response.json(rawBody(routes[path]))
      })
    )
    const { model, query } = await loadModelAt(testnetCfg, 7070)
    expect([...seen.keys()].sort()).toEqual(Object.keys(routes).sort())
    expect([...seen.values()].every((h) => h === '7070')).toBe(true)
    expect(model.ecosystems.length).toBeGreaterThan(0)
    expect(query.headers['At-Block-Height']).toBe('7070')
  })
})

describe('absentAt', () => {
  it('lists live entities missing at h and keeps their ids', () => {
    const live = testnetModel()
    const raw = live.raw
    const past = buildNetworkModel({
      ...raw,
      ecosystems: raw.ecosystems.filter((e) => e.id === 1),
      schemas: raw.schemas.filter((s) => s.ecosystem_id === 1),
      participants: [],
      dids: [],
    })
    const absent = absentAt(live, past)
    expect(absent.has('ecosystem:1')).toBe(false)
    expect(absent.has('ecosystem:14')).toBe(true)
    expect([...absent].every((id) => live.entities.has(id))).toBe(true)
  })
})
