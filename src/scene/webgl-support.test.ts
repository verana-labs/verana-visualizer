import { afterEach, describe, expect, it, vi } from 'vitest'
import { hasWebGL } from './webgl-support'

describe('hasWebGL', () => {
  afterEach(() => vi.restoreAllMocks())

  it('is true when a WebGL2 context can be created', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as RenderingContext)
    expect(hasWebGL()).toBe(true)
  })

  it('is false when the browser refuses a WebGL2 context', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    expect(hasWebGL()).toBe(false)
  })
})
