import { describe, expect, it } from 'vitest'
import { governanceVisibility, memberMarks, proposalPulse } from './governance-scene'

describe('governanceVisibility', () => {
  it('fades in on the governance lens and out when leaving it', () => {
    expect(governanceVisibility('governance', 'network', 0.25)).toBe(0.25)
    expect(governanceVisibility('governance', 'governance', 0)).toBe(1)
    expect(governanceVisibility('network', 'governance', 0.25)).toBe(0.75)
    expect(governanceVisibility('network', 'trust', 0.5)).toBe(0)
  })
})

describe('memberMarks', () => {
  it('rings members around their corporation and sizes them by weight share', () => {
    const marks = memberMarks({
      corporation: 'corporation:7',
      totalWeight: '4',
      members: [
        { address: 'verana1a', weight: '3', share: 0.75, metadata: '' },
        { address: 'verana1b', weight: '1', share: 0.25, metadata: '' },
      ],
    })
    expect(marks).toHaveLength(2)
    expect(marks[0].size).toBeGreaterThan(marks[1].size)
    for (const mark of marks) expect(Math.hypot(mark.offset[0], mark.offset[2])).toBeCloseTo(2.6, 5)
    expect(marks[0].offset).not.toEqual(marks[1].offset)
  })
})

describe('proposalPulse', () => {
  it('pulses open proposals and keeps closed ones steady', () => {
    expect(proposalPulse(true, 0, false)).not.toBe(proposalPulse(true, 400, false))
    expect(proposalPulse(false, 0, false)).toBe(proposalPulse(false, 400, false))
    expect(proposalPulse(true, 0, true)).toBe(proposalPulse(true, 400, true))
  })
})
