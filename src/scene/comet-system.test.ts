import { describe, expect, it } from 'vitest'
import { MODULE_COLORS } from '@/features/activity-feed/activity'
import {
  bezierPoint,
  COMET_CAP,
  COMET_MS,
  cometBrightness,
  cometLift,
  cometProgress,
  enqueueComets,
  STAGGER_MS,
  TRAIL_POINTS,
} from './comet-system'

const launch = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ target: `participant:${i}` as const, color: '#34d399' }))

describe('comet system', () => {
  it('flies for 1.8 s with a 26-point trail', () => {
    expect(COMET_MS).toBe(1800)
    expect(TRAIL_POINTS).toBe(26)
  })

  it('staggers the comets of one event', () => {
    const comets = enqueueComets([], launch(3), 1000, false)
    expect(comets.map((c) => c.startAt)).toEqual([1000, 1000 + STAGGER_MS, 1000 + 2 * STAGGER_MS])
  })

  it('caps concurrent comets and drops the oldest', () => {
    const first = enqueueComets([], launch(40), 0, false)
    const next = enqueueComets(
      first,
      launch(20).map((l) => ({ ...l, target: `agent:${l.target}` as const })),
      10,
      false
    )
    expect(COMET_CAP).toBe(48)
    expect(next).toHaveLength(48)
    expect(next[0].target).toBe('participant:12')
    expect(next[next.length - 1].target).toBe('agent:participant:19')
  })

  it('reports progress from launch to arrival', () => {
    const [comet] = enqueueComets([], launch(1), 1000, false)
    expect(cometProgress(comet, 900, false)).toBeLessThan(0)
    expect(cometProgress(comet, 1000 + COMET_MS / 2, false)).toBeCloseTo(0.5)
    expect(cometProgress(comet, 1000 + COMET_MS * 2, false)).toBe(1)
  })

  it('arrives instantly under reduced motion', () => {
    const comets = enqueueComets([], launch(3), 1000, true)
    expect(comets.every((c) => c.startAt === 1000)).toBe(true)
    expect(cometProgress(comets[2], 1000, true)).toBe(1)
  })

  it('follows a quadratic Bézier from the core lifted 40 units', () => {
    const lift = cometLift('network')
    expect(lift).toEqual([0, 40, 0])
    expect(cometLift('trust')).toEqual([0, 0, 40])
    const out: [number, number, number] = [0, 0, 0]
    expect(bezierPoint([0, 0, 0], [100, 0, 0], 0, lift, out)).toEqual([0, 0, 0])
    expect(bezierPoint([0, 0, 0], [100, 0, 0], 1, lift, out)).toEqual([100, 0, 0])
    expect(bezierPoint([0, 0, 0], [100, 0, 0], 0.5, lift, out)).toEqual([50, 20, 0])
  })

  it('keeps only real trust-deposit comets bright in the Economics lens', () => {
    expect(cometBrightness('economics', MODULE_COLORS.td)).toBe(1)
    expect(cometBrightness('economics', MODULE_COLORS.pp)).toBeLessThan(0.3)
    expect(cometBrightness('network', MODULE_COLORS.pp)).toBe(1)
  })
})
