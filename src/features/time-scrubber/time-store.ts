import { create } from 'zustand'
import type { EntityId } from '@/domain/network-model'

export const FADE_MS = 700

export interface TimeState {
  height: number | null
  absent: ReadonlySet<EntityId> | null
  previous: ReadonlySet<EntityId> | null
  changedAt: number
  playing: boolean
  setHeight(height: number | null): void
  setAbsent(absent: ReadonlySet<EntityId> | null, now?: number): void
  setPlaying(playing: boolean): void
  reset(): void
}

const INITIAL = { height: null, absent: null, previous: null, changedAt: 0, playing: false }

export const useTimeStore = create<TimeState>()((set) => ({
  ...INITIAL,
  setHeight: (height) => set((s) => (s.height === height ? s : { height })),
  setAbsent: (absent, now = performance.now()) =>
    set((s) => (s.absent === absent ? s : { absent, previous: s.absent, changedAt: now })),
  setPlaying: (playing) => set({ playing }),
  reset: () => set(INITIAL),
}))

type Presence = Pick<TimeState, 'absent' | 'previous' | 'changedAt'>

export function presenceOf(id: EntityId, state: Presence, now: number, reduced: boolean): number {
  const to = state.absent?.has(id) ? 0 : 1
  const from = state.previous?.has(id) ? 0 : 1
  if (reduced || to === from) return to
  const t = (now - state.changedAt) / FADE_MS
  if (t <= 0) return from
  if (t >= 1) return to
  return from + (to - from) * t
}
