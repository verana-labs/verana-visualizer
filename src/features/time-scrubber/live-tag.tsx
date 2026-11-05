'use client'

import type { EntityId } from '@/domain/network-model'
import { useTimeStore } from './time-store'

const number = (n: number) => n.toLocaleString('en-US')

export function LiveTag() {
  const height = useTimeStore((s) => s.height)
  if (height === null) return null
  return (
    <div data-testid="live-tag" className="text-[10px] uppercase tracking-[.09em] text-[#fbbf24]">
      Live · not at block {number(height)}
    </div>
  )
}

export function AbsentAtBlock({ id }: { id: EntityId }) {
  const height = useTimeStore((s) => s.height)
  const absent = useTimeStore((s) => s.absent?.has(id) ?? false)
  if (height === null || !absent) return null
  return (
    <div role="status" className="mb-2 text-[11.5px] text-[#fbbf24]">
      Not present at block {number(height)}
    </div>
  )
}
