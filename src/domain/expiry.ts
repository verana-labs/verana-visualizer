import type { Participant } from '@/lib/api/schemas'

export const EXPIRY_WINDOW_DAYS = 30
const WINDOW_MS = EXPIRY_WINDOW_DAYS * 86_400_000

export const effectiveEnd = (p: Participant) => (p.effective_until ? Date.parse(p.effective_until) : Number.NaN)

export function isExpiringSoon(p: Participant, now: Date): boolean {
  const end = effectiveEnd(p)
  return !p.revoked && p.op_state !== 'TERMINATED' && end > now.getTime() && end <= now.getTime() + WINDOW_MS
}
