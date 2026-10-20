import type { Participant } from '@/lib/api/schemas'

export type ParticipantState = 'SLASHED' | 'REVOKED' | 'EXPIRED' | 'FUTURE' | 'ACTIVE'

export function participantState(p: Participant, now: Date): ParticipantState {
  if (p.slashed && !p.repaid) return 'SLASHED'
  if (p.revoked) return 'REVOKED'
  if (p.effective_until && new Date(p.effective_until) < now) return 'EXPIRED'
  if (p.effective_from && new Date(p.effective_from) > now) return 'FUTURE'
  return 'ACTIVE'
}

export function isCountedParticipant(p: Participant): boolean {
  return p.op_state !== 'TERMINATED'
}
