export interface LogoMask {
  width: number
  height: number
  alpha: Uint8ClampedArray
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
}

export interface Point {
  x: number
  y: number
}

export const REPEL_RADIUS = 70
const STIFFNESS = 42
const DAMPING = 10
const REPEL_FORCE = 3200
const OPAQUE = 128

export function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function sampleLogoPoints(mask: LogoMask, count: number, seed: number): Point[] {
  const opaque: number[] = []
  for (let i = 0; i < mask.alpha.length; i++) {
    if (mask.alpha[i] >= OPAQUE) opaque.push(i)
  }
  if (opaque.length === 0) throw new Error(`sampleLogoPoints: mask ${mask.width}x${mask.height} has no opaque pixel`)
  const rnd = seeded(seed)
  const points: Point[] = []
  for (let i = 0; i < count; i++) {
    const index = opaque[Math.floor(rnd() * opaque.length)]
    const px = index % mask.width
    const py = Math.floor(index / mask.width)
    points.push({
      x: ((px + 0.05 + rnd() * 0.9) / mask.width) * 2 - 1,
      y: ((py + 0.05 + rnd() * 0.9) / mask.height) * 2 - 1,
    })
  }
  return points
}

export function stepParticle(p: Particle, target: Point, pointer: Point | null, dt: number, reduced: boolean): void {
  if (reduced) {
    p.x = target.x
    p.y = target.y
    p.vx = 0
    p.vy = 0
    return
  }
  let ax = STIFFNESS * (target.x - p.x) - DAMPING * p.vx
  let ay = STIFFNESS * (target.y - p.y) - DAMPING * p.vy
  if (pointer) {
    const dx = p.x - pointer.x
    const dy = p.y - pointer.y
    const d2 = dx * dx + dy * dy
    if (d2 < REPEL_RADIUS * REPEL_RADIUS && d2 > 1e-6) {
      const d = Math.sqrt(d2)
      const push = 1 - d / REPEL_RADIUS
      const force = (REPEL_FORCE * push * push) / d
      ax += dx * force
      ay += dy * force
    }
  }
  p.vx += ax * dt
  p.vy += ay * dt
  p.x += p.vx * dt
  p.y += p.vy * dt
}

export const easeOutCubic = (x: number) => 1 - (1 - x) ** 3
