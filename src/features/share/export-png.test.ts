import { afterEach, describe, expect, it, vi } from 'vitest'
import { exportPng, pngFileName, stampText } from './export-png'

const stamp = {
  chainId: 'vna-testnet-1',
  blockHeight: 87_600,
  at: '2026-10-19T21:00:42.512Z',
  source: 'idx.testnet.verana.network',
}

afterEach(() => vi.restoreAllMocks())

describe('stampText', () => {
  it('names the network, block, UTC time and source', () => {
    expect(stampText(stamp)).toBe('vna-testnet-1 · block 87,600 · 2026-10-19 21:00 UTC · idx.testnet.verana.network')
  })
})

describe('pngFileName', () => {
  it('uses the chain id and the raw block height', () => {
    expect(pngFileName(stamp)).toBe('verana-vna-testnet-1-block-87600.png')
  })
})

describe('exportPng', () => {
  it('composites the scene and the stamp text onto a 2D canvas and returns a PNG blob', () => {
    const scene = document.createElement('canvas')
    scene.width = 1600
    scene.height = 900
    const calls: string[] = []
    const ctx = {
      drawImage: (source: unknown, x: number, y: number) => calls.push(`draw ${source === scene} ${x},${y}`),
      fillText: (text: string) => calls.push(`text ${text}`),
      measureText: (text: string) => ({ width: text.length * 8 }),
      fillRect: () => calls.push('rect'),
      set font(_: string) {},
      set fillStyle(_: string) {},
      set textBaseline(_: string) {},
    }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => ctx as unknown as CanvasRenderingContext2D
    )
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(`data:image/png;base64,${btoa('png-bytes')}`)

    const blob = exportPng(scene, stamp)

    expect(calls[0]).toBe('draw true 0,0')
    expect(calls).toContain(`text ${stampText(stamp)}`)
    expect(blob.type).toBe('image/png')
    expect(blob.size).toBe('png-bytes'.length)
  })

  it('fails loudly when no 2D context is available', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    expect(() => exportPng(document.createElement('canvas'), stamp)).toThrow(/2D canvas/)
  })
})
