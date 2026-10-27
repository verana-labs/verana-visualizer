import type { Constellation } from '@/domain/governance'
import { seededRandom } from '@/layouts/seed'
import type { Vec3 } from '@/layouts/types'

const MEMBER_RING = 2.6
const MEMBER_BASE = 0.28
const MEMBER_SPAN = 0.6

export interface MemberMark {
  key: string
  offset: Vec3
  size: number
}

export function memberMarks(constellation: Constellation): MemberMark[] {
  const start = seededRandom(constellation.corporation)() * Math.PI * 2
  const n = constellation.members.length
  return constellation.members.map((member, i) => {
    const angle = start + (i / Math.max(1, n)) * Math.PI * 2
    return {
      key: `${constellation.corporation}:${member.address}`,
      offset: [
        Math.cos(angle) * MEMBER_RING,
        (seededRandom(member.address)() - 0.5) * 0.8,
        Math.sin(angle) * MEMBER_RING,
      ],
      size: MEMBER_BASE + MEMBER_SPAN * Math.sqrt(member.share),
    }
  })
}
