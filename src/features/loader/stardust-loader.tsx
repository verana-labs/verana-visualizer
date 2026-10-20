'use client'

import Image from 'next/image'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { FetchError } from '@/lib/fetch-json'

interface StardustLoaderProps {
  progress: number
  label: string
  error: FetchError | null
  done: boolean
  onExited: () => void
  onRetry?: () => void
}

const INK = '#c4b5fd'
const ERROR_INK = '#f87171'
const RING_DOTS = 72
const CORE_DOTS = 520
const HALO_DOTS = 220
const EXIT_MS = 1900
const REDUCED_EXIT_MS = 300
const LOGO_SIZE = 56

const clamp01 = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x)

const ringLit = (position: number, progress: number) => clamp01((progress * (31 / 30) - position) * 30)

function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Dot {
  role: 'core' | 'halo' | 'ring'
  a: number
  b: number
  c: number
  size: number
  ox: number
  oy: number
}

function buildDots(): Dot[] {
  const rnd = seeded(5)
  const dots: Dot[] = []
  for (let i = 0; i < CORE_DOTS; i++) {
    dots.push({ role: 'core', a: rnd(), b: rnd(), c: rnd(), size: 0.9 + rnd() ** 5 * 1.3, ox: 0, oy: 0 })
  }
  for (let i = 0; i < HALO_DOTS; i++) {
    dots.push({ role: 'halo', a: rnd(), b: rnd(), c: rnd(), size: 0.9 + rnd() ** 5 * 1.3, ox: 0, oy: 0 })
  }
  for (let i = 0; i < RING_DOTS; i++) {
    dots.push({ role: 'ring', a: i / RING_DOTS, b: rnd(), c: rnd(), size: 2.2, ox: 0, oy: 0 })
  }
  return dots
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function StardustLoader({ progress, label, error, done, onExited, onRetry }: StardustLoaderProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointerRef = useRef<{ x: number; y: number } | null>(null)
  const progressRef = useRef(progress)
  const errorRef = useRef(error)
  const exitAtRef = useRef<number | null>(null)
  const onExitedRef = useRef(onExited)
  const dots = useMemo(buildDots, [])
  const [still] = useState(prefersReducedMotion)
  const [shown, setShown] = useState(progress)
  const [entered, setEntered] = useState(still)
  const [exiting, setExiting] = useState(false)
  const exitMs = still ? REDUCED_EXIT_MS : EXIT_MS

  progressRef.current = progress
  errorRef.current = error
  onExitedRef.current = onExited

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    if (!done) return
    exitAtRef.current = performance.now()
    setExiting(true)
    const timer = setTimeout(() => onExitedRef.current(), exitMs)
    return () => clearTimeout(timer)
  }, [done, exitMs])

  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext?.('2d')
    if (!root || !canvas || !ctx) return

    let raf = 0
    let last = performance.now()
    const t0 = last
    let glide = progressRef.current
    let lastPct = Math.round(glide * 100)

    const tick = (now: number) => {
      const dt = Math.min(64, now - last)
      last = now
      const t = still ? 0 : (now - t0) / 1000
      const w = root.clientWidth
      const h = root.clientHeight
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      const target = exitAtRef.current === null ? progressRef.current : 1
      glide += (target - glide) * Math.min(1, 0.1 * (dt / 16.7))
      if (target - glide < 0.002) glide = target
      const pct = Math.round(glide * 100)
      if (pct !== lastPct) {
        lastPct = pct
        setShown(glide)
      }

      const failed = errorRef.current !== null
      const exit = exitAtRef.current === null ? 0 : clamp01((now - exitAtRef.current) / exitMs)
      const cx = w / 2
      const cy = h * 0.47
      const unit = Math.min(w, h)
      const ringRadius = unit * 0.2
      const pointer = pointerRef.current
      const reach = unit * 0.12
      const spin = still ? 0 : t * 0.14

      for (const dot of dots) {
        let x: number
        let y: number
        let alpha: number
        if (dot.role === 'core') {
          const radius =
            LOGO_SIZE * 0.75 + unit * 0.06 * dot.a ** 1.5 * (1 + (still ? 0 : 0.06 * Math.sin(t * 1.6 + dot.c * 9)))
          const angle = dot.b * Math.PI * 2 + spin * (1 - dot.a)
          x = cx + Math.cos(angle) * radius
          y = cy + Math.sin(angle) * radius
          alpha = (0.25 + 0.75 * (1 - dot.a)) * (0.35 + 0.65 * glide)
        } else if (dot.role === 'halo') {
          const angle = dot.b * Math.PI * 2 + (still ? 0 : t * 0.05) * (dot.c < 0.5 ? 1 : -1)
          const radius = ringRadius * (1.08 + dot.a * 0.3)
          x = cx + Math.cos(angle) * radius
          y = cy + Math.sin(angle) * radius
          alpha = 0.1 + 0.2 * dot.c
        } else {
          const angle = -Math.PI / 2 + dot.a * Math.PI * 2
          x = cx + Math.cos(angle) * ringRadius
          y = cy + Math.sin(angle) * ringRadius
          alpha = failed ? 0.9 : 0.09 + 0.91 * ringLit(dot.a, glide)
        }

        if (exit > 0) {
          const k = still ? 1 : 1 + exit * exit * 3.2
          x = cx + (x - cx) * k
          y = cy + (y - cy) * k
          alpha *= 1 - exit
        }

        if (pointer && !still) {
          const dx = x - pointer.x
          const dy = y - pointer.y
          const d2 = dx * dx + dy * dy
          if (d2 < reach * reach && d2 > 0.01) {
            const d = Math.sqrt(d2)
            const push = 1 - d / reach
            dot.ox += ((dx / d) * push * push * reach * 0.55 - dot.ox) * 0.12
            dot.oy += ((dy / d) * push * push * reach * 0.55 - dot.oy) * 0.12
            alpha += push * 0.5
          } else {
            dot.ox -= dot.ox * 0.12
            dot.oy -= dot.oy * 0.12
          }
        } else {
          dot.ox -= dot.ox * 0.12
          dot.oy -= dot.oy * 0.12
        }
        x += dot.ox
        y += dot.oy

        if (alpha < 0.02) continue
        ctx.globalAlpha = alpha > 1 ? 1 : alpha
        ctx.fillStyle = failed && dot.role === 'ring' ? ERROR_INK : INK
        ctx.fillRect(x - dot.size / 2, y - dot.size / 2, dot.size, dot.size)
      }
      ctx.globalAlpha = 1
      if (exit < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [dots, still, exitMs])

  const counter = String(Math.round(shown * 100)).padStart(3, '0')

  return (
    <div
      ref={rootRef}
      data-testid="stardust-loader"
      className="fixed inset-0 z-50 overflow-hidden bg-scene-bg text-scene-txt"
      style={{
        opacity: exiting ? 0 : 1,
        transition: `opacity ${exitMs}ms ${still ? 'linear' : 'cubic-bezier(.5,0,.9,.5)'}`,
        pointerEvents: exiting ? 'none' : 'auto',
      }}
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        pointerRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      }}
      onPointerLeave={() => {
        pointerRef.current = null
      }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 size-full" aria-hidden />
      <div className="pointer-events-none absolute left-1/2 top-[47%] -translate-x-1/2 -translate-y-1/2">
        <Image
          src="/logo.svg"
          alt="Verana"
          width={LOGO_SIZE}
          height={LOGO_SIZE}
          priority
          className="block"
          style={{
            filter: 'drop-shadow(0 0 14px rgba(167,139,250,.65))',
            opacity: exiting ? 0 : entered ? 1 : 0,
            transform: exiting && !still ? 'scale(1.8)' : entered ? 'scale(1)' : 'scale(.4)',
            transition: still ? 'none' : exiting ? `all ${exitMs}ms ease-in` : 'all 700ms cubic-bezier(.2,.8,.2,1)',
          }}
        />
      </div>
      <div
        className="absolute left-1/2 top-[47%] flex -translate-x-1/2 flex-col items-center gap-2"
        style={{ marginTop: '26vmin' }}
      >
        <div className="font-mono text-3xl tabular-nums tracking-[.12em]" style={{ color: error ? ERROR_INK : INK }}>
          {counter}
        </div>
        {error ? (
          <>
            <p role="alert" className="max-w-[min(90vw,32rem)] text-center text-sm" style={{ color: ERROR_INK }}>
              Could not read the network: {error.message}
            </p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="rounded-full border border-scene-line px-4 py-1.5 text-xs uppercase tracking-[.09em] text-scene-txt transition-colors hover:bg-white/10"
              >
                Retry
              </button>
            )}
          </>
        ) : (
          <p className="font-mono text-[11px] uppercase tracking-[.14em] text-scene-mut">{label}</p>
        )}
      </div>
    </div>
  )
}
