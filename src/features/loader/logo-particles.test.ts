import { describe, expect, it } from 'vitest'
import { type LogoMask, type Particle, REPEL_RADIUS, sampleLogoPoints, stepParticle } from './logo-particles'

function ringMask(size: number): LogoMask {
  const alpha = new Uint8ClampedArray(size * size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - size / 2, y - size / 2)
      if (d > size * 0.25 && d < size * 0.4) alpha[y * size + x] = 255
      else if (d > size * 0.1 && d < size * 0.15) alpha[y * size + x] = 40
    }
  }
  return { width: size, height: size, alpha }
}

const opaqueAt = (mask: LogoMask, x: number, y: number) => {
  const px = Math.floor(((x + 1) / 2) * mask.width)
  const py = Math.floor(((y + 1) / 2) * mask.height)
  return mask.alpha[py * mask.width + px] >= 128
}

describe('sampleLogoPoints', () => {
  const mask = ringMask(64)

  it('returns exactly count points, all inside opaque mask pixels', () => {
    const points = sampleLogoPoints(mask, 1500, 7)
    expect(points).toHaveLength(1500)
    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(-1)
      expect(p.x).toBeLessThanOrEqual(1)
      expect(p.y).toBeGreaterThanOrEqual(-1)
      expect(p.y).toBeLessThanOrEqual(1)
      expect(opaqueAt(mask, p.x, p.y)).toBe(true)
    }
  })

  it('is deterministic for a seed and differs for another seed', () => {
    expect(sampleLogoPoints(mask, 200, 3)).toEqual(sampleLogoPoints(mask, 200, 3))
    expect(sampleLogoPoints(mask, 200, 3)).not.toEqual(sampleLogoPoints(mask, 200, 4))
  })

  it('fails fast on a mask with no opaque pixel', () => {
    const empty = { width: 4, height: 4, alpha: new Uint8ClampedArray(16) }
    expect(() => sampleLogoPoints(empty, 10, 1)).toThrow(/no opaque pixel/)
  })
})

describe('stepParticle', () => {
  const target = { x: 0, y: 0 }
  const fresh = (): Particle => ({ x: 0, y: 0, vx: 0, vy: 0 })

  it('pushes a particle away from a pointer inside the repel radius', () => {
    const p = fresh()
    const pointer = { x: REPEL_RADIUS * 0.4, y: 0 }
    for (let i = 0; i < 10; i++) stepParticle(p, target, pointer, 1 / 60, false)
    expect(p.x).toBeLessThan(-1)
  })

  it('leaves a particle alone when the pointer is outside the radius', () => {
    const p = fresh()
    const pointer = { x: REPEL_RADIUS * 1.2, y: 0 }
    for (let i = 0; i < 10; i++) stepParticle(p, target, pointer, 1 / 60, false)
    expect(p).toEqual(fresh())
  })

  it('springs back to its target within 2 s once the pointer leaves', () => {
    const p = fresh()
    const pointer = { x: 10, y: 6 }
    for (let i = 0; i < 60; i++) stepParticle(p, target, pointer, 1 / 60, false)
    expect(Math.hypot(p.x, p.y)).toBeGreaterThan(10)
    for (let i = 0; i < 120; i++) stepParticle(p, target, null, 1 / 60, false)
    expect(Math.hypot(p.x - target.x, p.y - target.y)).toBeLessThan(0.5)
    expect(Math.hypot(p.vx, p.vy)).toBeLessThan(2)
  })

  it('snaps to the target under reduced motion and ignores the pointer', () => {
    const p: Particle = { x: 40, y: -30, vx: 5, vy: 5 }
    stepParticle(p, { x: 3, y: 4 }, { x: 3, y: 4 }, 1 / 60, true)
    expect(p).toEqual({ x: 3, y: 4, vx: 0, vy: 0 })
  })
})
