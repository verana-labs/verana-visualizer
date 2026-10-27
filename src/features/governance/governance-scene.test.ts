import { describe, expect, it } from 'vitest'
import { memberMarks } from './governance-scene'

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
