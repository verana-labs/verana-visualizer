const WAVE_START = 8
export const WAVE_REACH = 170

export function blockChange(shown: number | null, next: number | null): { record: boolean; pulse: boolean } {
  if (next === null || next === shown) return { record: false, pulse: false }
  return { record: true, pulse: shown !== null }
}

export function waveRadius(t: number): number {
  return WAVE_START + t * (WAVE_REACH - WAVE_START)
}
