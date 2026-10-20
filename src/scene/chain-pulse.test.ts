import { describe, expect, it } from 'vitest'
import { blockChange, WAVE_REACH, waveRadius } from './chain-pulse'

describe('blockChange', () => {
  it('records the first observed height without pulsing', () => {
    expect(blockChange(null, 96_381)).toEqual({ record: true, pulse: false })
  })

  it('pulses only when a later height differs', () => {
    expect(blockChange(96_381, 96_381)).toEqual({ record: false, pulse: false })
    expect(blockChange(96_381, 96_382)).toEqual({ record: true, pulse: true })
  })

  it('ignores an unknown height', () => {
    expect(blockChange(null, null)).toEqual({ record: false, pulse: false })
    expect(blockChange(96_381, null)).toEqual({ record: false, pulse: false })
  })
})

describe('waveRadius', () => {
  it('grows from the start radius to exactly 170 units', () => {
    expect(waveRadius(0)).toBe(8)
    expect(waveRadius(1)).toBe(WAVE_REACH)
    expect(WAVE_REACH).toBe(170)
  })
})
