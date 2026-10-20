import { create } from 'zustand'

export interface TourState {
  step: number | null
  presenting: boolean
  note: string | null
  start(step?: number): void
  go(step: number): void
  present(): void
  exit(): void
  setNote(note: string | null): void
}

export const useTour = create<TourState>()((set) => ({
  step: null,
  presenting: false,
  note: null,
  start: (step = 0) => set({ step, presenting: false, note: null }),
  go: (step) => set({ step }),
  present: () => set({ step: 0, presenting: true, note: null }),
  exit: () => set({ step: null, presenting: false, note: null }),
  setNote: (note) => set({ note }),
}))
