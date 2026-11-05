import { describe, expect, it } from 'vitest'
import { buildNetworkModel } from '@/domain/network-model'
import { recordedNetwork } from '../../tests/support/recorded'
import { cachedRegistryBoard, registryBoard, registryLayout } from './registry'

const NOW = new Date('2026-10-20T12:00:00Z')
const testnet = buildNetworkModel(recordedNetwork('testnet'))
const devnetRaw = recordedNetwork('devnet')
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
    const raw = recordedNetwork('devnet')
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

  it('shares one board, and its now, between the lens layout and the scene labels', () => {
    const board = cachedRegistryBoard(testnet)
    expect(cachedRegistryBoard(testnet)).toBe(board)
    expect(registryLayout(testnet)).toBe(board.layout)
  })
})
