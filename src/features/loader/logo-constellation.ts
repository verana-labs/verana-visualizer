import {
  easeOutCubic,
  type LogoMask,
  type Particle,
  type Point,
  sampleLogoPoints,
  seeded,
  stepParticle,
} from './logo-particles'

const MARK_PATHS = [
  'M26.9932 51.6972L5.805 11.0977L2.91263 16.2161L0 10.6048L5.98725 0L26.9932 40.2483L47.9993 0L54 10.6217L51.0773 16.2161L48.1849 11.0977L26.9932 51.6972Z',
  'M13.696 0L26.9935 25.4637L39.9367 0H13.696Z',
]
const MARK_BOX = 54
const MARK_HEIGHT = 51.6972
const TINTS = ['#ece8ff', '#ddd5fe', '#d0c4fe', '#c4b5fd']
const ENTRANCE_MS = 1600
const MAX_DELAY = 0.25

export const MARK_ASPECT = MARK_HEIGHT / MARK_BOX

export function rasteriseLogoMask(size: number): LogoMask | null {
  if (typeof document === 'undefined' || typeof Path2D === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.scale(size / MARK_BOX, size / MARK_BOX)
  ctx.translate(0, (MARK_BOX - MARK_HEIGHT) / 2)
  ctx.fillStyle = '#fff'
  for (const d of MARK_PATHS) ctx.fill(new Path2D(d))
  const rgba = ctx.getImageData(0, 0, size, size).data
  const alpha = new Uint8ClampedArray(size * size)
  for (let i = 0; i < alpha.length; i++) alpha[i] = rgba[i * 4 + 3]
  return { width: size, height: size, alpha }
}

function glowSprite(color: string) {
  const sprite = document.createElement('canvas')
  sprite.width = 32
  sprite.height = 32
  const ctx = sprite.getContext('2d')
  if (!ctx) return null
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
  g.addColorStop(0, '#ffffff')
  g.addColorStop(0.12, color)
  g.addColorStop(0.3, `${color}55`)
  g.addColorStop(1, `${color}00`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 32, 32)
  return sprite
}

export interface LogoField {
  count: number
  hx: Float32Array
  hy: Float32Array
  sx: Float32Array
  sy: Float32Array
  px: Float32Array
  py: Float32Array
  vx: Float32Array
  vy: Float32Array
  delay: Float32Array
  phase: Float32Array
  speed: Float32Array
  size: Float32Array
  tint: Uint8Array
  sprites: HTMLCanvasElement[]
  scale: number
}

export function createLogoField(mask: LogoMask, count: number, seed: number): LogoField | null {
  const sprites: HTMLCanvasElement[] = []
  for (const tint of TINTS) {
    const sprite = glowSprite(tint)
    if (!sprite) return null
    sprites.push(sprite)
  }
  const points = sampleLogoPoints(mask, count, seed)
  const rnd = seeded(seed + 1)
  const f: LogoField = {
    count,
    hx: new Float32Array(count),
    hy: new Float32Array(count),
    sx: new Float32Array(count),
    sy: new Float32Array(count),
    px: new Float32Array(count),
    py: new Float32Array(count),
    vx: new Float32Array(count),
    vy: new Float32Array(count),
    delay: new Float32Array(count),
    phase: new Float32Array(count),
    speed: new Float32Array(count),
    size: new Float32Array(count),
    tint: new Uint8Array(count),
    sprites,
    scale: 0,
  }
  for (let i = 0; i < count; i++) {
    const { x, y } = points[i]
    f.hx[i] = x
    f.hy[i] = y
    const angle = Math.atan2(y, x) + (rnd() - 0.5) * 0.9
    const reach = (Math.hypot(x, y) + 0.3) * (4 + rnd() * 2)
    f.sx[i] = Math.cos(angle) * reach
    f.sy[i] = Math.sin(angle) * reach
    f.delay[i] = rnd() * MAX_DELAY
    f.phase[i] = rnd() * Math.PI * 2
    f.speed[i] = 0.6 + rnd() * 1.8
    f.size[i] = 0.8 + rnd() ** 4 * 1.1
    f.tint[i] = Math.floor(rnd() * TINTS.length)
  }
  return f
}

export interface LogoFrame {
  cx: number
  cy: number
  scale: number
  elapsed: number
  t: number
  dt: number
  exit: number
  hover: number
  pointer: Point | null
  still: boolean
}

const scratch: Particle = { x: 0, y: 0, vx: 0, vy: 0 }
const home: Point = { x: 0, y: 0 }

export function drawLogoField(ctx: CanvasRenderingContext2D, f: LogoField, frame: LogoFrame) {
  const { cx, cy, scale, still } = frame
  if (f.scale === 0) {
    for (let i = 0; i < f.count; i++) {
      f.px[i] = f.hx[i] * scale
      f.py[i] = f.hy[i] * scale
    }
  }
  f.scale = scale
  const flight = still ? 1 : frame.elapsed / ENTRANCE_MS
  const glow = 1 + 0.25 * frame.hover
  const exitPush = frame.exit * frame.exit
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < f.count; i++) {
    scratch.x = f.px[i]
    scratch.y = f.py[i]
    scratch.vx = f.vx[i]
    scratch.vy = f.vy[i]
    home.x = f.hx[i] * scale
    home.y = f.hy[i] * scale
    stepParticle(scratch, home, frame.pointer, frame.dt, still)
    f.px[i] = scratch.x
    f.py[i] = scratch.y
    f.vx[i] = scratch.vx
    f.vy[i] = scratch.vy

    const raw = (flight - f.delay[i]) / (1 - MAX_DELAY)
    const e = raw >= 1 ? 1 : raw <= 0 ? 0 : easeOutCubic(raw)
    let x = scratch.x * e + f.sx[i] * scale * (1 - e)
    let y = scratch.y * e + f.sy[i] * scale * (1 - e)
    let alpha = (0.1 + 0.9 * e) * 0.72
    if (!still) {
      alpha *= 0.78 + 0.22 * Math.sin(frame.t * f.speed[i] + f.phase[i])
      const band = Math.sin((f.hx[i] * 0.7 + f.hy[i] * 0.5) * 3.4 - frame.t * 1.3)
      if (band > 0 && frame.hover > 0) alpha += frame.hover * 0.4 * band ** 6
    }
    alpha *= glow
    if (frame.exit > 0) {
      const k = still ? 1 : 1 + exitPush * (2.4 + f.delay[i] * 10)
      x *= k
      y *= k
      alpha *= 1 - frame.exit
    }
    if (alpha < 0.02) continue
    const s = f.size[i] * (5 + 0.8 * frame.hover)
    ctx.globalAlpha = alpha > 1 ? 1 : alpha
    ctx.drawImage(f.sprites[f.tint[i]], cx + x - s / 2, cy + y - s / 2, s, s)
  }
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
}
