import { describe, expect, it } from 'vitest'
import type { EntityId } from '@/domain/network-model'
import { FADE_MS } from '@/features/time-scrubber/time-store'
import { needsRingRepaint } from './rings'

const absent: ReadonlySet<EntityId> = new Set(['ecosystem:1'])

describe('needsRingRepaint', () => {
  it('paints the first frame', () => {
    expect(needsRingRepaint(null, { absent: null, changedAt: 0 }, 10_000, false)).toBe(true)
  })

  it('leaves the colour buffer alone once settled on the same presence', () => {
    expect(needsRingRepaint({ absent, settled: true }, { absent, changedAt: 0 }, 10_000, false)).toBe(false)
  })

  it('repaints every frame of a time fade and once more when it ends', () => {
    const time = { absent, changedAt: 9_800 }
    expect(needsRingRepaint({ absent, settled: false }, time, 10_000, false)).toBe(true)
    expect(needsRingRepaint({ absent, settled: false }, time, 9_800 + FADE_MS + 1, false)).toBe(true)
    expect(needsRingRepaint({ absent, settled: true }, time, 9_800 + FADE_MS + 1, false)).toBe(false)
  })

  it('repaints when the absent set changes, even under reduced motion', () => {
    expect(needsRingRepaint({ absent: null, settled: true }, { absent, changedAt: 9_999 }, 10_000, true)).toBe(true)
  })
})
