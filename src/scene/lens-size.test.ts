import { describe, expect, it } from 'vitest'
import { lensSize } from './lens-size'

describe('lensSize', () => {
  it('uses the economics size only in the Economics lens and keeps the base elsewhere', () => {
    expect(lensSize(0.42, 1.1, 'economics', 'economics', 1)).toBe(1.1)
    expect(lensSize(0.42, 1.1, 'network', 'network', 1)).toBe(0.42)
    expect(lensSize(0.42, undefined, 'economics', 'network', 1)).toBe(0.42)
  })

  it('tweens between lenses', () => {
    expect(lensSize(0.4, 1.2, 'economics', 'network', 0.5)).toBeCloseTo(0.8)
    expect(lensSize(0.4, 1.2, 'trust', 'economics', 0.25)).toBeCloseTo(1)
  })
})
