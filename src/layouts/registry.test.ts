import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildNetworkModel, type RawNetwork } from '@/domain/network-model'
import { registryBoard, registryLayout } from './registry'

const rawOf = (network: string): RawNetwork => {
  const fixture = <T>(name: string): T =>
    JSON.parse(readFileSync(join(__dirname, '../../tests/fixtures', network, `${name}.json`), 'utf8')) as T
  return {
    ecosystems: fixture('ecosystems'),
    schemas: fixture('schemas'),
    participants: fixture('participants'),
    corporations: fixture('corporations'),
    dids: fixture<{ dids: string[] }>('dids').dids,
  }
}

const NOW = new Date('2026-10-20T12:00:00Z')
const testnet = buildNetworkModel(rawOf('testnet'))
const devnetRaw = rawOf('devnet')
const devnet = buildNetworkModel(devnetRaw)

const columnOf = (board: ReturnType<typeof registryBoard>, x: number) =>
  board.columns.find((c) => x >= c.left - 0.001 && x <= c.right + 0.001)?.key

describe('registryBoard', () => {
  it('draws only the onboarding columns the data has, sized to their counts', () => {
    const board = registryBoard(testnet, NOW)
    expect(board.columns.map((c) => [c.key, c.count])).toEqual([
      ['VALIDATED', 157],
      ['TERMINATED', 1],
    ])
    const [validated, terminated] = board.columns
    expect(validated.right - validated.left).toBeGreaterThan(terminated.right - terminated.left)
  })

  it('puts every participant in the column of its op_state', () => {
    const board = registryBoard(devnet, NOW)
    expect(board.columns.map((c) => c.key)).toEqual(['PENDING', 'VALIDATED'])
    for (const p of devnetRaw.participants) {
      const position = board.layout.positions.get(`participant:${p.id}`)
      expect(position, `participant:${p.id}`).toBeDefined()
      expect(columnOf(board, position?.[0] ?? Number.NaN), `participant:${p.id}`).toBe(p.op_state)
      expect(position?.[2]).toBe(0)
    }
  })

  it('moves accreditations that expire within 30 days into an expiry column, soonest at the top', () => {
    const raw = rawOf('devnet')
    const [a, b] = raw.participants.filter((p) => p.op_state === 'VALIDATED')
    a.effective_until = '2026-11-10T00:00:00Z'
    b.effective_until = '2026-10-23T00:00:00Z'
    const board = registryBoard(buildNetworkModel(raw), NOW)
    const expiry = board.columns.find((c) => c.key === 'EXPIRING')
    expect(expiry?.count).toBe(2)
    const at = (id: number) => board.layout.positions.get(`participant:${id}`) ?? [Number.NaN, Number.NaN, 0]
    expect(columnOf(board, at(a.id)[0])).toBe('EXPIRING')
    expect(at(b.id)[1]).toBeGreaterThan(at(a.id)[1])
  })

  it('keeps the board facing the camera and the core below it', () => {
    const { layout, columns } = registryBoard(testnet, NOW)
    const lowest = Math.min(...columns.map((c) => c.bottom))
    expect(layout.corePosition[1]).toBeLessThan(lowest)
  })

  it('is the layout the registry lens uses', () => {
    expect(registryLayout(testnet, { now: NOW })).toEqual(registryBoard(testnet, NOW).layout)
  })
})
