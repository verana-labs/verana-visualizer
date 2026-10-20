import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGlowTexture } from './glow-texture'

beforeEach(() => {
  const ctx = { createRadialGradient: () => ({ addColorStop: () => {} }), fillRect: () => {}, fillStyle: '' }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as RenderingContext)
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:,')
})

afterEach(() => vi.restoreAllMocks())

describe('useGlowTexture', () => {
  it('shares one texture across every user and disposes it after the last one unmounts', () => {
    const a = renderHook(() => useGlowTexture())
    const b = renderHook(() => useGlowTexture())
    expect(b.result.current).toBe(a.result.current)
    const dispose = vi.spyOn(a.result.current, 'dispose')
    a.unmount()
    expect(dispose).not.toHaveBeenCalled()
    b.unmount()
    expect(dispose).toHaveBeenCalledTimes(1)
    const c = renderHook(() => useGlowTexture())
    expect(c.result.current).not.toBe(a.result.current)
    c.unmount()
  })
})
